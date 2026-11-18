/** Homework rules (plan Phase 4, Sprint 12). The day limits are judgements to check with schools (Phase 0 not done). */

export const HOMEWORK_TITLE_MAX = 120;
export const HOMEWORK_DETAILS_MAX = 1000;

/** How far ahead a due date may be set, and how long after it the marking may be planned. */
export const HOMEWORK_DUE_DAYS_AHEAD = 60;
export const MARK_BY_DAYS_AFTER_DUE = 60;

/** The marking estimate for the whole class, in minutes. */
export const MARKING_MIN_MINUTES = 5;
export const MARKING_MAX_MINUTES = 600;

/** Homework due on one day for one class at which the setter is warned (plan Section 10 counts these days). */
export const LOAD_WARNING_DEADLINES = 3;

/** The setter's list starts this many days back, so recent homework can still be ticked and marked. */
export const MY_HOMEWORK_DAYS_BACK = 14;
/** A pupil's list starts this many days back. */
export const PUPIL_HOMEWORK_DAYS_BACK = 7;
/** Upper bound on either list; a teacher or class with more is not a real school week. */
export const HOMEWORK_LIST_MAX = 200;

/**
 * The class's shared goal on the pupil's board (hand-ins this week across the class) is withheld below this many pupils: in a
 * very small class a count points at the few who have not handed in.
 */
export const CLASS_GOAL_MIN_PUPILS = 5;
