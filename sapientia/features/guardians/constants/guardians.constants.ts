/** Guardians (plan Phase 4, Sprint 13). Judgements to check with schools are marked; see docs/phase-4-students.md. */

export const GUARDIAN_SESSION_COOKIE = 'sapientia_guardian';

/** The same limits as staff: guardians are adults, usually on their own phone. */
export const GUARDIAN_SESSION_IDLE_MINUTES = 60;
export const GUARDIAN_SESSION_ABSOLUTE_HOURS = 12;
export const GUARDIAN_SESSION_TOUCH_MINUTES = 5;

/** Staff's minimum: an adult's password. */
export const GUARDIAN_PASSWORD_MIN_LENGTH = 10;
export const GUARDIAN_PASSWORD_MAX_LENGTH = 128;

export const GUARDIAN_NAME_MAX = 120;

/** Every guardian username starts with this, so the one sign-in box can tell a guardian from a pupil. */
export const GUARDIAN_USERNAME_PREFIX = 'penjaga.';
/** For a first name with no Latin letters ("waris": next of kin, as on school forms). */
export const GUARDIAN_USERNAME_FALLBACK_STEM = 'waris';

/** Children one guardian may be linked to (judgement): a large family, not a class. */
export const GUARDIAN_LINKS_MAX = 10;

/** Relationship types: the type only, never the circumstances (plan Phase 4). */
export const GUARDIAN_RELATIONSHIPS = ['mother', 'father', 'guardian', 'grandparent', 'relative', 'other'] as const;

/** Why a guardian refuses a link: a fixed list, so no circumstances are written down. */
export const LINK_REFUSAL_REASONS = ['not_my_child', 'not_responsible', 'other'] as const;

/** Why an administrator removes a link: a fixed list for the same reason. */
export const LINK_REMOVAL_REASONS = ['entered_in_error', 'guardian_asked', 'school_decision', 'pupil_left'] as const;
