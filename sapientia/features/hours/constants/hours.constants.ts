import type { HoursKind } from '../interfaces/hours.interface';

/** In the order the form lists them. Matches the private_hours_kind enum in the database. */
export const HOURS_KINDS: readonly HoursKind[] = ['marking', 'preparation', 'administration', 'meetings', 'other'];

export const HOURS_NOTE_MAX = 200;
export const HOURS_MINUTES_MAX = 24 * 60;
/** How far back an entry may be dated, in days. */
export const HOURS_DAYS_BACK = 366;
/** Entries shown for one month; nobody logs more than a few a day. */
export const HOURS_ENTRIES_SHOWN_MAX = 300;
