import { DateTime } from 'luxon';
import { ConfigurationError } from '@/shared/server/app-errors';
import { CALENDAR_LOOKAHEAD_DAYS } from '../constants/delivery.constants';
import type { WorkingCalendar } from '../interfaces/working-calendar.interface';

/**
 * Held delivery rules (plan Sprint 4). Pure functions of an instant and a calendar: no clock, no database. Every instant is
 * read in the school's own time zone, so "7:30 am" means 7:30 at the school wherever the server runs.
 */

function atLocalTime(day: DateTime, hhmm: string): DateTime {
  const [hour, minute] = hhmm.split(':').map(Number);
  return day.set({ hour, minute, second: 0, millisecond: 0 });
}

/** A replacement working day wins over everything; then holidays and the weekend are days off. */
export function isWorkingDay(isoDate: string, calendar: WorkingCalendar): boolean {
  if (calendar.extraWorkingDays.has(isoDate)) return true;
  if (calendar.holidays.has(isoDate)) return false;
  const weekday = DateTime.fromISO(isoDate, { zone: calendar.timeZone }).weekday;
  return !calendar.weekendDays.includes(weekday as WorkingCalendar['weekendDays'][number]);
}

/** Inside working hours: on a working day, from work_start (inclusive) to work_end (exclusive). */
export function isWithinWorkingHours(instant: Date, calendar: WorkingCalendar): boolean {
  const local = DateTime.fromJSDate(instant, { zone: calendar.timeZone });
  if (!isWorkingDay(local.toISODate() ?? '', calendar)) return false;
  return local >= atLocalTime(local, calendar.workStart) && local < atLocalTime(local, calendar.workEnd);
}

/**
 * The first working-day start at or after the instant: today's start if it is still to come on a working day, otherwise
 * the start of the next working day. A calendar with no working day in a year is a configuration error, not a loop.
 */
export function nextWorkingStart(instant: Date, calendar: WorkingCalendar): Date {
  const local = DateTime.fromJSDate(instant, { zone: calendar.timeZone });
  for (let offset = 0; offset <= CALENDAR_LOOKAHEAD_DAYS; offset++) {
    const day = local.startOf('day').plus({ days: offset });
    if (!isWorkingDay(day.toISODate() ?? '', calendar)) continue;
    const start = atLocalTime(day, calendar.workStart);
    if (start >= local) return start.toJSDate();
  }
  throw new ConfigurationError('The school calendar has no working day in the next year. Check the weekend and holidays.');
}

/** When a task created at this instant reaches its assignees: now inside working hours, otherwise the next working start. */
export function deliveryTime(createdAt: Date, calendar: WorkingCalendar): Date {
  return isWithinWorkingHours(createdAt, calendar) ? createdAt : nextWorkingStart(createdAt, calendar);
}
