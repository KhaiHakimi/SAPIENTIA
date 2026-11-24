import { DateTime } from 'luxon';
import type { IsoWeekday, WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { isWorkingDay } from '@/features/delivery/services/working-time.service';
import type { DigestWeek } from '../interfaces/digest.interface';

const DAYS_IN_WEEK = 7;
const MONDAY: IsoWeekday = 1;

const previousWeekday = (day: IsoWeekday): IsoWeekday => (((day + DAYS_IN_WEEK - 2) % DAYS_IN_WEEK) + 1) as IsoWeekday;

/**
 * The weekday the school's week starts on: the day after its weekend ends, so Monday for a Saturday-Sunday weekend and
 * Sunday for a Friday-Saturday one (Kelantan, Terengganu). Monday when the weekend has no clear end, such as no weekend.
 */
export function schoolWeekStart(weekendDays: readonly IsoWeekday[]): IsoWeekday {
  const isWeekend = (day: IsoWeekday) => weekendDays.includes(day);
  const starts = ([1, 2, 3, 4, 5, 6, 7] as const).filter((day) => !isWeekend(day) && isWeekend(previousWeekday(day)));
  return starts.includes(MONDAY) || starts.length === 0 ? MONDAY : starts[0];
}

/**
 * Whether this week's digest is due at this instant: on the first working day of the school's week (Monday, or Tuesday
 * after a Monday holiday, and so on; Sunday where the weekend is Friday and Saturday), from the start of working hours
 * until midnight. A week with no working day has no digest, and a day the worker misses entirely is not made up later in
 * the week: by then the list is out of date. Pure: the calendar must hold the week's holidays (load it from a week before
 * now).
 */
export function digestWeekDue(now: Date, calendar: WorkingCalendar): DigestWeek | null {
  const local = DateTime.fromJSDate(now, { zone: calendar.timeZone });
  const startDay = schoolWeekStart(calendar.weekendDays);
  const weekStart = local.startOf('day').minus({ days: (local.weekday - startDay + DAYS_IN_WEEK) % DAYS_IN_WEEK });
  const firstDay = Array.from({ length: DAYS_IN_WEEK }, (_, offset) => weekStart.plus({ days: offset }))
    .find((day) => isWorkingDay(day.toISODate() ?? '', calendar));
  if (!firstDay || !firstDay.hasSame(local, 'day')) return null;
  const [hour, minute] = calendar.workStart.split(':').map(Number);
  if (local < firstDay.set({ hour, minute, second: 0, millisecond: 0 })) return null;
  return {
    weekOf: weekStart.toISODate() ?? '',
    weekEndsOn: weekStart.plus({ days: DAYS_IN_WEEK - 1 }).toISODate() ?? '',
    today: local.toISODate() ?? '',
  };
}
