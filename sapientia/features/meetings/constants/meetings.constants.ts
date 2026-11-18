/** Meeting requests from guardians to teachers (plan Phase 4, Sprint 13 part 2). Lists match the database enums. */

export const MEETING_TOPICS = ['homework', 'progress', 'conduct', 'other'] as const;
export const MEETING_TIMES_OF_DAY = ['morning', 'afternoon', 'any'] as const;
export const MEETING_DECLINE_REASONS = ['see_other_teacher', 'not_available', 'other'] as const;

/** Requests a guardian may have waiting at once, across all their children: enough for real needs, too few to flood teachers. */
export const MEETING_PENDING_MAX = 3;

/** How far ahead a teacher may set the meeting. */
export const MEETING_DAYS_AHEAD_MAX = 60;

/** Answered and closed requests stay on both lists this long; waiting ones stay until answered. */
export const MEETING_HISTORY_DAYS = 30;

/** Upper bound on one list (a teacher's, or one child's for a guardian). */
export const MEETING_LIST_MAX = 100;
