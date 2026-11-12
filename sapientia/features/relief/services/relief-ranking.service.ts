import { RELIEF_SUGGESTIONS_MAX } from '../constants/relief.constants';
import type { ReliefSuggestion } from '../interfaces/relief.interface';

/**
 * Relief rules (plan Phase 2). Pure functions: no clock, no database. Times are "HH:mm" on one day, which compare
 * correctly as text.
 */

export interface BusyPeriod {
  teacherId: string;
  start: string;
  end: string;
}

/** Everyone with a period that overlaps [start, end). A period that ends exactly when another starts does not overlap. */
export function busyTeacherIds(periods: readonly BusyPeriod[], start: string, end: string): Set<string> {
  return new Set(periods.filter((period) => period.start < end && start < period.end).map((period) => period.teacherId));
}

/**
 * The order the plan sets: fewest relief classes this month, then least committed work this week. Names break a tie so
 * the answer is the same every time it is asked. Only the first few are returned: a person chooses among them, and the
 * rest of the staff are never listed in order.
 */
export function rankReliefCandidates(candidates: readonly ReliefSuggestion[], limit = RELIEF_SUGGESTIONS_MAX): ReliefSuggestion[] {
  return [...candidates]
    .sort((a, b) =>
      a.reliefThisMonth - b.reliefThisMonth
      || a.committedMinutesThisWeek - b.committedMinutesThisWeek
      || a.teacher.name.localeCompare(b.teacher.name)
      || a.teacher.id.localeCompare(b.teacher.id))
    .slice(0, limit);
}
