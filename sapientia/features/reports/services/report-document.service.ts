import { formatDuration } from '@/features/capacity/services/duration-text';
import { NOT_HELD_REASONS } from '@/features/lessons/constants/lessons.constants';
import { LESSONS_MESSAGES } from '@/features/lessons/i18n/lessons.messages';
import { formatDate, formatDay, formatMonth } from '@/shared/i18n/format-date';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import { WELLBEING_MIN_GROUP } from '../constants/reports.constants';
import { REPORTS_MESSAGES } from '../i18n/reports.messages';
import type { ReportDocument, ReportSection, ReportTable, ReportValue } from '../interfaces/report-document.interface';
import type { MonthlyReport } from '../interfaces/monthly-report.interface';

/** A table, with each column marked as numeric when it holds numbers only. */
const table = (columns: string[], rows: ReportValue[][], empty: string): ReportTable => ({
  columns,
  rows,
  numeric: columns.map((_, index) => rows.length > 0 && rows.every((row) => typeof row[index] === 'number')),
  empty,
});

const section = (part: Omit<ReportSection, 'notes' | 'facts' | 'table'> & Partial<ReportSection>): ReportSection =>
  ({ notes: [], facts: [], table: null, ...part });

/** Held as a whole percentage of scheduled, or a dash when nothing was scheduled. */
function heldShare(held: number, scheduled: number): string {
  return scheduled > 0 ? `${Math.round((held / scheduled) * 100)}%` : '–';
}

/**
 * Turns a monthly report into the words and numbers shown in one language. Pure: the page renders it in the browser, and
 * the PDF and Excel exports render the same document on the server.
 */
export function buildReportDocument(report: MonthlyReport, lang: Lang): ReportDocument {
  const text = REPORTS_MESSAGES[lang];
  const reasonText = LESSONS_MESSAGES[lang].reasons;
  const day = (isoDay: string) => formatDay(isoDay, lang);
  const duration = (minutes: number) => formatDuration(minutes, lang);
  const { lessons, tasks, wellbeing } = report;

  const heading = [
    report.schoolName,
    report.period ? text.covers(day(report.period.from), day(report.period.to)) : text.noDaysYet,
    text.generated(formatDate(report.generatedAt, lang, { withTime: true, timeZone: report.timeZone })),
    text.genericFormat,
  ];

  const sections: ReportSection[] = [
    section({
      id: 'lessons',
      title: text.lessons.title,
      notes: [text.lessons.note],
      facts: [
        { label: text.lessons.scheduled, value: lessons.scheduled },
        { label: text.lessons.held, value: lessons.held },
        { label: text.lessons.notHeld, value: lessons.notHeld },
        { label: text.lessons.notRecorded, value: lessons.notRecorded },
        { label: text.lessons.heldShare, value: heldShare(lessons.held, lessons.scheduled) },
      ],
    }),
    section({
      id: 'reasons',
      title: text.reasons.title,
      table: table(
        [text.reasons.reason, text.reasons.count],
        NOT_HELD_REASONS.filter((reason) => lessons.reasons[reason] > 0).map((reason) => [reasonText[reason], lessons.reasons[reason]]),
        text.none,
      ),
    }),
    section({
      id: 'subjects',
      title: text.subjects.title,
      table: table(
        [text.subjects.subject, text.lessons.scheduled, text.lessons.held, text.lessons.notHeld, text.lessons.notRecorded],
        lessons.bySubject.map((row) => [row.subject ?? text.subjects.noSubject, row.scheduled, row.held, row.notHeld, row.notRecorded]),
        text.none,
      ),
    }),
    section({
      id: 'relief',
      title: text.relief.title,
      facts: [
        { label: text.relief.arranged, value: lessons.relief.arranged },
        { label: text.relief.recordedHeld, value: lessons.relief.recordedHeld },
      ],
    }),
    section({
      id: 'tasks',
      title: text.tasks.title,
      facts: [
        { label: text.tasks.delivered, value: tasks.delivered },
        { label: text.tasks.due, value: tasks.due },
        { label: text.tasks.doneOnTime, value: tasks.doneOnTime },
        { label: text.tasks.doneLate, value: tasks.doneLate },
        { label: text.tasks.notDone, value: tasks.notDone },
        { label: text.tasks.flagged, value: tasks.flaggedDeadlines },
        { label: text.tasks.extensionsRequested, value: tasks.extensions.requested },
        { label: text.tasks.extensionsApproved, value: tasks.extensions.approved },
        { label: text.tasks.extensionsCountered, value: tasks.extensions.countered },
        { label: text.tasks.extensionsPending, value: tasks.extensions.pending },
      ],
    }),
    section({
      id: 'overrides',
      title: text.overrides.title,
      notes: [
        text.overrides.note,
        ...(tasks.urgentOverrides.count > tasks.urgentOverrides.listed.length
          ? [text.overrides.capped(tasks.urgentOverrides.listed.length, tasks.urgentOverrides.count)]
          : []),
      ],
      facts: [{ label: text.overrides.count, value: tasks.urgentOverrides.count }],
      table: table(
        [text.overrides.date, text.overrides.reason],
        tasks.urgentOverrides.listed.map((override) => [day(override.onDate), override.reason]),
        text.none,
      ),
    }),
    section({
      id: 'wellbeing',
      title: text.wellbeing.title,
      notes: [text.wellbeing.note, ...(wellbeing.averagesShown ? [] : [text.wellbeing.withheld(WELLBEING_MIN_GROUP)])],
      facts: [
        { label: text.wellbeing.teachingStaff, value: wellbeing.teachingStaff },
        { label: text.wellbeing.workingDays, value: wellbeing.workingDays },
        ...(wellbeing.averagesShown
          ? [
              { label: text.wellbeing.averageFree, value: duration(wellbeing.averageFreeMinutesPerDay ?? 0) },
              { label: text.wellbeing.averageTask, value: duration(wellbeing.averageTaskMinutes ?? 0) },
            ]
          : []),
        { label: text.wellbeing.flagged, value: wellbeing.flaggedDeadlines },
        { label: text.wellbeing.extensionRequests, value: wellbeing.extensionRequests },
      ],
    }),
    section({
      id: 'sharedHours',
      title: text.sharedHours.title,
      notes: [text.sharedHours.note],
      table: table(
        [text.sharedHours.name, text.sharedHours.total, text.sharedHours.sharedOn],
        report.sharedHours.map((share) => [
          share.name, duration(share.minutes), formatDate(share.sharedAt, lang, { timeZone: report.timeZone }),
        ]),
        text.sharedHours.empty,
      ),
    }),
  ];

  return { title: text.reportTitle(formatMonth(report.month, lang)), heading, sections };
}
