/** Only tasks created this recently are compared: an old task with the same title is usually this term's repeat, not a duplicate. */
export const SIMILAR_LOOKBACK_DAYS = 30;

/** At most this many recent tasks are compared per check, newest first, so the check stays cheap in a busy school. */
export const SIMILAR_CANDIDATES_MAX = 300;

/** The form shows the closest few, not a list to read through. */
export const SIMILAR_SHOWN_MAX = 3;

/** The form waits for typing to pause this long before checking. */
export const SIMILAR_DEBOUNCE_MS = 500;
