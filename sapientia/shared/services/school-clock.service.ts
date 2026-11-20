import { DateTime } from 'luxon';
import type { SchoolNow } from '@/shared/interfaces/school-clock.interface';

/** The school's date and minutes after midnight at an instant. */
export function schoolNow(instant: Date, timeZone: string): SchoolNow {
  const local = DateTime.fromJSDate(instant, { zone: timeZone });
  return { today: local.toISODate() ?? '', minutes: local.hour * 60 + local.minute };
}

/** The Monday of the week holding a day, moved by whole weeks (negative goes back). */
export function mondayOf(isoDay: string, weeks = 0): string {
  return DateTime.fromISO(isoDay, { zone: 'utc' }).startOf('week').plus({ weeks }).toISODate() ?? '';
}

/** The day a number of days after another (negative goes back). */
export function addDays(isoDay: string, days: number): string {
  return DateTime.fromISO(isoDay, { zone: 'utc' }).plus({ days }).toISODate() ?? '';
}

/** Whole days from one day to another; negative when "to" is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round(DateTime.fromISO(to, { zone: 'utc' }).diff(DateTime.fromISO(from, { zone: 'utc' }), 'days').days);
}

/** 0 for Monday to 6 for Sunday. */
export function weekdayIndex(isoDay: string): number {
  return DateTime.fromISO(isoDay, { zone: 'utc' }).weekday - 1;
}
