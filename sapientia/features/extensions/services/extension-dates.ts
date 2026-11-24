import type { Feasibility } from '@/features/capacity/interfaces/capacity.interface';

const DAY_MS = 86_400_000;

/** The calendar day after a YYYY-MM-DD day. Worked out in UTC, so no time zone can shift it. */
export function dayAfter(isoDay: string): string {
  return new Date(Date.parse(`${isoDay}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

/**
 * The earliest date an extension can be asked for or given: later than the current due date, and never in the past, which
 * matters once the work is overdue. `today` is the school's date.
 */
export function earliestExtensionDay(currentDueOn: string, today: string): string {
  const next = dayAfter(currentDueOn);
  return next > today ? next : today;
}

/**
 * The date an extension request starts from: the earliest day the work fits, when the capacity check found one later than
 * that least date; otherwise the least that can be asked for (see earliestExtensionDay).
 */
export function suggestedDueOn(currentDueOn: string, feasibility: Feasibility | null, today: string): string {
  const least = earliestExtensionDay(currentDueOn, today);
  const earliest = feasibility?.earliestDueOn;
  return earliest && earliest > least ? earliest : least;
}
