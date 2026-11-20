import { DateTime } from 'luxon';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { isWorkingDay } from '@/features/delivery/services/working-time.service';
import { FEASIBILITY_LOOKAHEAD_DAYS } from '../constants/capacity.constants';
import type { DatedSlot, Feasibility, FeasibilityInput, WeeklySlot } from '../interfaces/capacity.interface';

/**
 * Capacity rules (plan Phase 2). Pure functions of a calendar, a weekly timetable and a list of commitments: no clock, no
 * database. Time outside working hours is never free, so no deadline can count on a teacher's evening or weekend.
 *
 * Deliberate simplification (plan Phase 2, risk to watch): committed work is one total per due date, not scheduled hour by
 * hour. A task counts in full once its due date is inside the period being checked, and not at all before that.
 */

interface DayMinutes {
  working: number;
  teaching: number;
}

const toMinutes = (hhmm: string): number => {
  const [hour, minute] = hhmm.split(':').map(Number);
  return hour * 60 + minute;
};

/** A teacher's fixed time: the weekly timetable, and periods on particular dates such as relief classes. */
interface BusyTime {
  slots: readonly WeeklySlot[];
  datedSlots: readonly DatedSlot[];
}

/** Minutes of the day's periods that fall inside [from, to), counting overlapping periods once. */
function teachingWithin(busy: BusyTime, day: DateTime, from: number, to: number): number {
  const isoDate = day.toISODate();
  const periods = [...busy.slots.filter((slot) => slot.weekday === day.weekday), ...busy.datedSlots.filter((slot) => slot.date === isoDate)]
    .map((slot) => [Math.max(toMinutes(slot.start), from), Math.min(toMinutes(slot.end), to)] as const)
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let coveredTo = from;
  for (const [start, end] of periods) {
    if (end <= coveredTo) continue;
    total += end - Math.max(start, coveredTo);
    coveredTo = end;
  }
  return total;
}

/** Working and teaching minutes on one school day, from `notBefore` (minutes after midnight) to the end of work. */
function minutesOnDay(day: DateTime, calendar: WorkingCalendar, busy: BusyTime, notBefore = 0): DayMinutes {
  if (!isWorkingDay(day.toISODate() ?? '', calendar)) return { working: 0, teaching: 0 };
  const start = Math.max(toMinutes(calendar.workStart), notBefore);
  const end = toMinutes(calendar.workEnd);
  if (end <= start) return { working: 0, teaching: 0 };
  return { working: end - start, teaching: teachingWithin(busy, day, start, end) };
}

/** The last day (Sunday) of the week the instant falls in at the school, as YYYY-MM-DD. */
export function weekEndDay(instant: Date, timeZone: string): string {
  return DateTime.fromJSDate(instant, { zone: timeZone }).endOf('week').toISODate() ?? '';
}

/**
 * Working minutes with no timetable period or dated period, from an instant to the end of work on a day (YYYY-MM-DD,
 * school-local). Zero when the day is before the instant.
 */
export function freeMinutes(
  calendar: WorkingCalendar,
  slots: readonly WeeklySlot[],
  from: Date,
  untilDay: string,
  datedSlots: readonly DatedSlot[] = [],
): number {
  const start = DateTime.fromJSDate(from, { zone: calendar.timeZone });
  const last = DateTime.fromISO(untilDay, { zone: calendar.timeZone });
  let total = 0;
  for (let day = start.startOf('day'); day <= last; day = day.plus({ days: 1 })) {
    const { working, teaching } = minutesOnDay(day, calendar, { slots, datedSlots }, day.hasSame(start, 'day') ? start.hour * 60 + start.minute : 0);
    total += working - teaching;
  }
  return total;
}

/**
 * Can this teacher fit `neededMinutes` between delivery and the end of the due day, after teaching and the work they
 * already have? Also finds the earliest day by which they could, for the warning and the extension request.
 */
export function checkFeasibility(input: FeasibilityInput): Feasibility {
  const { calendar, commitments, neededMinutes } = input;
  const busy: BusyTime = { slots: input.slots, datedSlots: input.datedSlots ?? [] };
  const start = DateTime.fromJSDate(input.from, { zone: calendar.timeZone });
  const firstDay = start.startOf('day');
  const dueDay = DateTime.fromISO(input.dueOn, { zone: calendar.timeZone });
  const lastDay = (dueDay > firstDay ? dueDay : firstDay).plus({ days: FEASIBILITY_LOOKAHEAD_DAYS });
  const committedBy = (isoDate: string) =>
    commitments.reduce((total, commitment) => (commitment.dueOn <= isoDate ? total + commitment.minutes : total), 0);

  let working = 0;
  let teaching = 0;
  let atDue = { working: 0, teaching: 0 };
  let earliestDueOn: string | null = null;
  for (let day = firstDay; day <= lastDay; day = day.plus({ days: 1 })) {
    const isoDate = day.toISODate() ?? '';
    const minutes = minutesOnDay(day, calendar, busy, day.equals(firstDay) ? start.hour * 60 + start.minute : 0);
    working += minutes.working;
    teaching += minutes.teaching;
    const fits = working - teaching - committedBy(isoDate) >= neededMinutes;
    if (isoDate === input.dueOn) {
      atDue = { working, teaching };
      // An earlier day that only fits because work due later is not yet counted is not a real answer: look past the due day.
      if (!fits) earliestDueOn = null;
    }
    // Only a day with working time is worth suggesting as a due date.
    if (earliestDueOn === null && fits && minutes.working > 0) earliestDueOn = isoDate;
    if (earliestDueOn !== null && day >= dueDay) break;
  }

  const committed = committedBy(input.dueOn);
  const free = Math.max(0, atDue.working - atDue.teaching - committed);
  return {
    feasible: free >= neededMinutes,
    neededMinutes,
    freeMinutes: free,
    workingMinutes: atDue.working,
    teachingMinutes: atDue.teaching,
    committedMinutes: committed,
    earliestDueOn,
  };
}
