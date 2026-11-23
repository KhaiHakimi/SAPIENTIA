import { DateTime } from 'luxon';
import { CALENDAR_LOOKAHEAD_DAYS } from '../constants/delivery.constants';

/**
 * The latest due date the app accepts, counted from the school's date today (YYYY-MM-DD). The working calendar is only
 * loaded this far ahead, so a later date could not be checked against holidays, and every capacity check walks the days up
 * to it: an unbounded date would tie the server up for as long as the walk takes.
 */
export function latestDueOn(today: string): string {
  return DateTime.fromISO(today, { zone: 'utc' }).plus({ days: CALENDAR_LOOKAHEAD_DAYS }).toISODate() ?? '';
}

/** True when a due date (YYYY-MM-DD) is further ahead than the app accepts. */
export function isBeyondDueHorizon(dueOn: string, today: string): boolean {
  return dueOn > latestDueOn(today);
}
