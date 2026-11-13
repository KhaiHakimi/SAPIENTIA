import { DateTime } from 'luxon';
import { freeMinutes } from '@/features/capacity/services/capacity.service';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { isWorkingDay } from '@/features/delivery/services/working-time.service';
import { NOT_HELD_REASONS } from '@/features/lessons/constants/lessons.constants';
import type { NotHeldReason } from '@/features/lessons/interfaces/lesson.interface';
import { WELLBEING_MIN_GROUP } from '../constants/reports.constants';
import type {
  LessonCounts, LessonInput, LessonRecordFact, MonthlyLessons, MonthlyWellbeing, SubjectLessonCounts, WellbeingInput,
} from '../interfaces/monthly-report.interface';

/**
 * Rules of the monthly report (plan Phase 3). Pure functions of a calendar, the timetable and the records: no clock, no
 * database. A lesson with no record is "not recorded", never "absent" (docs/phase-3-evidence.md).
 */

/**
 * The days a month's report covers, given today at the school: the whole month once it is over; for the current month, its
 * first day up to yesterday (today is still going on). Null when no day of the month has ended yet.
 */
export function reportPeriod(month: string, today: string): { from: string; to: string } | null {
  const start = DateTime.fromISO(`${month}-01`, { zone: 'UTC' });
  const from = start.toISODate() ?? '';
  const monthEnd = start.endOf('month').toISODate() ?? '';
  const yesterday = DateTime.fromISO(today, { zone: 'UTC' }).minus({ days: 1 }).toISODate() ?? '';
  const to = monthEnd < yesterday ? monthEnd : yesterday;
  return to >= from ? { from, to } : null;
}

/** The working days of a period, in order. */
export function workingDaysIn(period: { from: string; to: string } | null, calendar: WorkingCalendar): string[] {
  if (!period) return [];
  const days: string[] = [];
  const last = DateTime.fromISO(period.to, { zone: 'UTC' });
  for (let day = DateTime.fromISO(period.from, { zone: 'UTC' }); day <= last; day = day.plus({ days: 1 })) {
    const isoDate = day.toISODate() ?? '';
    if (isWorkingDay(isoDate, calendar)) days.push(isoDate);
  }
  return days;
}

const emptyCounts = (): LessonCounts => ({ scheduled: 0, held: 0, notHeld: 0, notRecorded: 0 });

function addTo(counts: LessonCounts, record: LessonRecordFact | undefined): void {
  counts.scheduled += 1;
  if (!record) counts.notRecorded += 1;
  else if (record.status === 'held') counts.held += 1;
  else counts.notHeld += 1;
}

/**
 * Scheduled lessons against what was recorded. A lesson is scheduled on each working day of the period that falls on its
 * weekday, from the day its period was added. A record whose period has since been deleted, or whose day later became a
 * holiday, still counts as a scheduled lesson: the record is the evidence that it was.
 */
export function countLessons(input: LessonInput): Omit<MonthlyLessons, 'relief'> {
  const recordsByKey = new Map<string, LessonRecordFact>();
  const orphans: LessonRecordFact[] = [];
  for (const record of input.records) {
    if (record.slotId) recordsByKey.set(`${record.slotId}|${record.onDate}`, record);
    else orphans.push(record);
  }

  const total = emptyCounts();
  const bySubject = new Map<string | null, SubjectLessonCounts>();
  const tally = (subject: string | null, record: LessonRecordFact | undefined) => {
    addTo(total, record);
    let counts = bySubject.get(subject);
    if (!counts) bySubject.set(subject, (counts = { subject, ...emptyCounts() }));
    addTo(counts, record);
  };

  const counted = new Set<string>();
  for (const day of workingDaysIn(input.period, input.calendar)) {
    const weekday = DateTime.fromISO(day, { zone: 'UTC' }).weekday;
    for (const slot of input.slots) {
      if (slot.weekday !== weekday || slot.createdOn > day) continue;
      const key = `${slot.id}|${day}`;
      counted.add(key);
      tally(slot.subjectName, recordsByKey.get(key));
    }
  }
  for (const [key, record] of recordsByKey) if (!counted.has(key)) tally(record.subjectName, record);
  for (const record of orphans) tally(record.subjectName, record);

  const reasons = Object.fromEntries(NOT_HELD_REASONS.map((reason) => [reason, 0])) as Record<NotHeldReason, number>;
  for (const record of input.records) if (record.status === 'not_held' && record.reason) reasons[record.reason] += 1;

  return {
    ...total,
    reasons,
    bySubject: [...bySubject.values()].sort((a, b) =>
      a.subject === null ? 1 : b.subject === null ? -1 : a.subject.localeCompare(b.subject)),
  };
}

/**
 * School-level wellbeing indicators. Averages are over teaching staff and are withheld below WELLBEING_MIN_GROUP people.
 * Free time is working time with no timetable period or relief class; task work is not taken off it, so the two averages
 * can be read side by side.
 */
export function summariseWellbeing(input: WellbeingInput): MonthlyWellbeing {
  const workingDays = workingDaysIn(input.period, input.calendar).length;
  const teachingStaff = input.teachers.length;
  const averagesShown = teachingStaff >= WELLBEING_MIN_GROUP && input.period !== null;
  let averageFreeMinutesPerDay: number | null = null;
  let averageTaskMinutes: number | null = null;
  if (averagesShown && input.period) {
    const from = DateTime.fromISO(input.period.from, { zone: input.calendar.timeZone }).toJSDate();
    const free = input.teachers.reduce(
      (total, teacher) => total + freeMinutes(input.calendar, teacher.slots, from, input.period?.to ?? '', teacher.datedSlots),
      0,
    );
    averageFreeMinutesPerDay = workingDays > 0 ? Math.round(free / teachingStaff / workingDays) : 0;
    averageTaskMinutes = Math.round(input.taskMinutes / teachingStaff);
  }
  return {
    teachingStaff,
    workingDays,
    averagesShown,
    averageFreeMinutesPerDay,
    averageTaskMinutes,
    flaggedDeadlines: input.flaggedDeadlines,
    extensionRequests: input.extensionRequests,
  };
}
