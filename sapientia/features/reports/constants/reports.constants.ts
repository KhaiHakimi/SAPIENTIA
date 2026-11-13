import type { ReportFormat } from '../interfaces/monthly-report.interface';

/**
 * Fewest teaching staff for which the wellbeing averages are shown. Below it an average describes two or three known people,
 * which singles them out (plan Phase 3: never single out a teacher). A judgement to check with schools.
 */
export const WELLBEING_MIN_GROUP = 5;

/** Urgent overrides listed in one report; the count is always the full number. */
export const URGENT_OVERRIDES_LISTED_MAX = 200;

export const REPORT_FORMATS: readonly ReportFormat[] = ['pdf', 'xlsx'];

export const REPORT_CONTENT_TYPES: Record<ReportFormat, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
