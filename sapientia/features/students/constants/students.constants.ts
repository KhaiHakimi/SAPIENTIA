/** Pupil accounts (plan Phase 4, Sprint 11). Judgements to check with schools are marked; see docs/phase-4-students.md. */

export const STUDENT_SESSION_COOKIE = 'sapientia_student';

/** Shorter than staff (60 minutes, 12 hours): pupils often share classroom computers. */
export const STUDENT_SESSION_IDLE_MINUTES = 30;
export const STUDENT_SESSION_ABSOLUTE_HOURS = 8;
/** last_seen_at is written at most this often. */
export const STUDENT_SESSION_TOUCH_MINUTES = 5;

/** A slip's password works this long if the pupil never signs in (judgement). */
export const STARTING_PASSWORD_VALID_DAYS = 14;
/** NIST SP 800-63B's minimum; staff have 10. A judgement for young pupils. */
export const STUDENT_PASSWORD_MIN_LENGTH = 8;
export const STUDENT_PASSWORD_MAX_LENGTH = 128;

/** Pupils added in one go (judgement): about one class. */
export const STUDENTS_PER_BATCH = 50;
export const STUDENT_NAME_MAX = 120;
export const SCHOOL_NUMBER_MAX = 20;

/** Starting passwords use letters and digits that cannot be misread on paper (no 0/o, 1/l/i). 31 characters. */
export const STARTING_PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
/** Two groups of four, for example "k7mp-x3ra": about 40 bits, typed once, throttled and short-lived. */
export const STARTING_PASSWORD_GROUPS = 2;
export const STARTING_PASSWORD_GROUP_LENGTH = 4;

/** Usernames: up to 12 letters of the first name, then four digits. A name with no Latin letters uses this instead. */
export const USERNAME_FALLBACK_STEM = 'murid';
export const USERNAME_STEM_MAX = 12;
export const USERNAME_DIGITS = 4;
