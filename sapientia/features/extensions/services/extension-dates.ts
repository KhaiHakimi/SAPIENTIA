import type { Feasibility } from '@/features/capacity/interfaces/capacity.interface';

const DAY_MS = 86_400_000;

/** The calendar day after a YYYY-MM-DD day. Worked out in UTC, so no time zone can shift it. */
export function dayAfter(isoDay: string): string {
  return new Date(Date.parse(`${isoDay}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

/**
 * The date an extension request starts from: the earliest day the work fits, when the capacity check found one later than
 * the current due date; otherwise the next day, which is the least that can be asked for.
 */
export function suggestedDueOn(currentDueOn: string, feasibility: Feasibility | null): string {
  const earliest = feasibility?.earliestDueOn;
  return earliest && earliest > currentDueOn ? earliest : dayAfter(currentDueOn);
}
