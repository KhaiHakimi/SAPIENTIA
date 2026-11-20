export const SESSION_COOKIE = 'sapientia_session';

/** Signed out after this long without a request (plan Sprint 2: expiry on inactivity). */
export const SESSION_IDLE_MINUTES = 60;
/** Signed out after this long whatever the activity: one school day plus margin. */
export const SESSION_ABSOLUTE_HOURS = 12;
/** last_seen_at is written at most this often, so reading pages does not mean a database write per request. */
export const SESSION_TOUCH_MINUTES = 5;

export const INVITE_VALID_HOURS = 48;

/** Failed sign-ins allowed per window before further attempts are refused. */
export const THROTTLE_WINDOW_MINUTES = 15;
export const THROTTLE_MAX_PER_EMAIL = 5;
export const THROTTLE_MAX_PER_ADDRESS = 30;
