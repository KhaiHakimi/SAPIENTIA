import type { NotHeldReason } from '../interfaces/lesson.interface';

/** How far back a lesson can still be recorded or changed, in days (a judgement to check with teachers). */
export const LESSON_RECORD_DAYS_BACK = 30;

export const LESSON_NOTE_MAX = 200;
export const ERPH_URL_MAX = 500;

/** In the order the form lists them. Matches the lesson_not_held_reason enum in the database. */
export const NOT_HELD_REASONS: readonly NotHeldReason[] = [
  'official_duty', 'leave', 'school_programme', 'pupils_away', 'examination', 'other',
];
