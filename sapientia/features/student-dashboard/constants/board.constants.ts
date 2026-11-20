/** What every piece of homework pays when the pupil ticks it: one rate, so no subject or teacher looks worth more. */
export const QUEST_XP = 30;
export const QUEST_COINS = 10;

/** How often the board's clock moves on, for the "now" lesson and the minutes left. */
export const SCHOOL_CLOCK_TICK_MS = 30_000;

/**
 * The afternoon reminder (plan Phase 4: pupil reminders in the afternoon only, never late at night): homework due on the next
 * school day shows on the board from 2 pm to 6 pm school time, and not at all outside that window. Minutes after midnight.
 */
export const REMINDER_FROM_MINUTES = 14 * 60;
export const REMINDER_UNTIL_MINUTES = 18 * 60;
