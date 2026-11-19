import { DateTime } from 'luxon';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { isWorkingDay } from '@/features/delivery/services/working-time.service';
import type { DigestWeek } from '../interfaces/digest.interface';

const DAYS_IN_WEEK = 7;

/**
 * Whether this week's digest is due at this instant: on the first working day of the school's week (Monday, or Tuesday
 * after a Monday holiday, and so on), from the start of working hours until midnight. A week with no working day has no
 * digest, and a day the worker misses entirely is not made up later in the week: by then the list is out of date. Pure: the
 * calendar must hold the week's holidays (load it from a week before now).
 */
export function digestWeekDue(now: Date, calendar: WorkingCalendar): DigestWeek | null {
  const local = DateTime.fromJSDate(now, { zone: calendar.timeZone });
  const monday = local.startOf('week');
  const firstDay = Array.from({ length: DAYS_IN_WEEK }, (_, offset) => monday.plus({ days: offset }))
    .find((day) => isWorkingDay(day.toISODate() ?? '', calendar));
  if (!firstDay || !firstDay.hasSame(local, 'day')) return null;
  const [hour, minute] = calendar.workStart.split(':').map(Number);
  if (local < firstDay.set({ hour, minute, second: 0, millisecond: 0 })) return null;
  return {
    weekOf: monday.toISODate() ?? '',
    weekEndsOn: monday.plus({ days: DAYS_IN_WEEK - 1 }).toISODate() ?? '',
    today: local.toISODate() ?? '',
  };
}
