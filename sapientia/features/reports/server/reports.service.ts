import 'server-only';
import { DateTime } from 'luxon';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { DatedSlot, WeeklySlot } from '@/features/capacity/interfaces/capacity.interface';
import type { IsoWeekday, WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { listEvents, loadSettings } from '@/features/delivery/server/school-calendar.repository';
import { listSharedTotals } from '@/features/hours/server/hours.service';
import { listReliefTimes } from '@/features/relief/server/relief.repository';
import { listSlotTimes } from '@/features/timetable/server/timetable.repository';
import type { Clock } from '@/shared/interfaces/clock.interface';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import { NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, type Queryable } from '@/shared/server/database.service';
import { REPORT_CONTENT_TYPES, URGENT_OVERRIDES_LISTED_MAX } from '../constants/reports.constants';
import type { MonthlyReport, ReportFormat } from '../interfaces/monthly-report.interface';
import { buildReportDocument } from '../services/report-document.service';
import { countLessons, reportPeriod, summariseWellbeing } from '../services/monthly-report.service';
import { renderReportPdf } from './report-pdf.renderer';
import { renderReportXlsx } from './report-xlsx.renderer';
import {
  countRelief, countTaskFigures, listLessonRecordFacts, listLessonSlots, listTeachingStaffIds, listUrgentOverrides, type ReportRange,
  sumTaskMinutesDue,
} from './reports.repository';

/**
 * The monthly principal report (plan Phase 3, Sprint 10). Administrators only. School-level counts, the reasons senders gave
 * for urgent sends, and the hours totals people chose to share; nothing that monitors a teacher (no times in the app, no
 * "last online", no per-teacher lesson counts).
 */

function groupBy<Row, Value>(rows: readonly Row[], keyOf: (row: Row) => string, valueOf: (row: Row) => Value): Map<string, Value[]> {
  const groups = new Map<string, Value[]>();
  for (const row of rows) groups.set(keyOf(row), [...(groups.get(keyOf(row)) ?? []), valueOf(row)]);
  return groups;
}

/** The school's calendar for one month: its settings and the holidays and replacement days in that month. */
async function monthCalendar(db: Queryable, schoolId: string, month: string): Promise<WorkingCalendar> {
  const settings = await loadSettings(db, schoolId);
  const start = DateTime.fromISO(`${month}-01`, { zone: 'UTC' });
  const events = await listEvents(db, schoolId, start.toISODate() ?? '', start.endOf('month').toISODate() ?? '');
  return {
    timeZone: settings.timeZone,
    workStart: settings.workStart,
    workEnd: settings.workEnd,
    weekendDays: settings.weekendDays,
    holidays: new Set(events.filter((event) => event.kind === 'holiday').map((event) => event.onDate)),
    extraWorkingDays: new Set(events.filter((event) => event.kind === 'working_day').map((event) => event.onDate)),
  };
}

/**
 * The days counted, as dates and as instants in the school's zone. With no finished day the range is empty (it ends the day
 * before it starts), so every query simply finds nothing.
 */
function reportRange(month: string, period: { from: string; to: string } | null, timeZone: string): ReportRange {
  const from = period?.from ?? `${month}-01`;
  const to = period?.to ?? (DateTime.fromISO(from, { zone: 'UTC' }).minus({ days: 1 }).toISODate() ?? '');
  const fromAt = DateTime.fromISO(from, { zone: timeZone }).toJSDate();
  const toAt = DateTime.fromISO(to, { zone: timeZone }).plus({ days: 1 }).toJSDate();
  return { from, to, fromAt, toAt: toAt < fromAt ? fromAt : toAt, timeZone };
}

/** Each teaching member of staff's weekly periods and relief classes, for the free-time average. */
async function loadTeachers(db: Queryable, schoolId: string, ids: readonly string[], range: ReportRange) {
  if (ids.length === 0) return [];
  const [slotRows, reliefRows] = await Promise.all([listSlotTimes(db, schoolId, ids), listReliefTimes(db, schoolId, ids, range.from)]);
  const slots = groupBy(slotRows, (row) => row.teacher_id,
    (row): WeeklySlot => ({ weekday: row.weekday as IsoWeekday, start: row.start_time, end: row.end_time }));
  const relief = groupBy(reliefRows.filter((row) => row.on_date <= range.to), (row) => row.teacher_id,
    (row): DatedSlot => ({ date: row.on_date, start: row.start_time, end: row.end_time }));
  return ids.map((id) => ({ slots: slots.get(id) ?? [], datedSlots: relief.get(id) ?? [] }));
}

/** GET /api/reports/monthly: the report for a month (YYYY-MM) that has started. */
export async function getMonthlyReport(actor: SessionUser, month: string, clock: Clock): Promise<MonthlyReport> {
  if (actor.role !== 'admin') throw new NotFoundError();
  const db = getPool();
  const now = clock.now();
  const calendar = await monthCalendar(db, actor.schoolId, month);
  const today = DateTime.fromJSDate(now, { zone: calendar.timeZone }).toISODate() ?? '';
  if (month > today.slice(0, 7)) throw new ValidationError({ month: 'future_month' });

  const period = reportPeriod(month, today);
  const range = reportRange(month, period, calendar.timeZone);
  const [slots, records, relief, taskFigures, urgentOverrides, teacherIds, sharedHours] = await Promise.all([
    listLessonSlots(db, actor.schoolId, calendar.timeZone),
    listLessonRecordFacts(db, actor.schoolId, range),
    countRelief(db, actor.schoolId, range),
    countTaskFigures(db, actor.schoolId, range),
    listUrgentOverrides(db, actor.schoolId, range, URGENT_OVERRIDES_LISTED_MAX),
    listTeachingStaffIds(db, actor.schoolId),
    listSharedTotals(actor, month, db),
  ]);
  const [teachers, taskMinutes] = await Promise.all([
    loadTeachers(db, actor.schoolId, teacherIds, range),
    teacherIds.length > 0 ? sumTaskMinutesDue(db, actor.schoolId, teacherIds, range) : Promise.resolve(0),
  ]);

  return {
    month,
    schoolName: actor.schoolName,
    period,
    generatedAt: now.toISOString(),
    timeZone: calendar.timeZone,
    lessons: { ...countLessons({ calendar, period, slots, records }), relief },
    tasks: { ...taskFigures, urgentOverrides },
    wellbeing: summariseWellbeing({
      calendar, period, teachers, taskMinutes,
      flaggedDeadlines: taskFigures.flaggedDeadlines,
      extensionRequests: taskFigures.extensions.requested,
    }),
    sharedHours,
  };
}

export interface ReportFile {
  body: Uint8Array<ArrayBuffer>;
  contentType: string;
  fileName: string;
}

/**
 * The report as a PDF or Excel file in one language. The audit log records who exported which month and in what format,
 * because the file can leave the system.
 */
export async function exportMonthlyReport(
  actor: SessionUser,
  request: { month: string; format: ReportFormat; lang: Lang },
  clock: Clock,
): Promise<ReportFile> {
  const report = await getMonthlyReport(actor, request.month, clock);
  const document = buildReportDocument(report, request.lang);
  const body = request.format === 'pdf' ? await renderReportPdf(document) : await renderReportXlsx(document, request.lang);
  await writeAudit(getPool(), actor.schoolId, [{
    actorId: actor.id, action: 'report.exported', entityType: 'school', entityId: actor.schoolId,
    metadata: { month: request.month, format: request.format },
  }]);
  const stem = request.lang === 'ms' ? 'laporan-bulanan' : 'monthly-report';
  return { body, contentType: REPORT_CONTENT_TYPES[request.format], fileName: `sapientia-${stem}-${request.month}.${request.format}` };
}
