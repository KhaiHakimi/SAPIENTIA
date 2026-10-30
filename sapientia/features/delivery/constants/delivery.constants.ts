import type { IsoWeekday } from '../interfaces/working-calendar.interface';

/** Until an administrator saves the school's own settings. 07:30 matches the plan; 17:00 is a placeholder to confirm. */
export const DEFAULT_WORK_START = '07:30';
export const DEFAULT_WORK_END = '17:00';
export const DEFAULT_WEEKEND: readonly IsoWeekday[] = [6, 7];

/** How far ahead to look for a working day before deciding the calendar has none. */
export const CALENDAR_LOOKAHEAD_DAYS = 366;

export const URGENT_REASON_MAX = 500;

/**
 * States the settings screen can suggest a Friday and Saturday weekend for (plan Section 12, item 2). Only a suggestion:
 * the school's saved weekend always wins. Check the current arrangement for any state before relying on this list.
 */
export const STATE_CODES = ['JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS', 'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY'] as const;
export type StateCode = (typeof STATE_CODES)[number];
export const FRIDAY_SATURDAY_STATES: readonly StateCode[] = ['KTN', 'TRG'];
