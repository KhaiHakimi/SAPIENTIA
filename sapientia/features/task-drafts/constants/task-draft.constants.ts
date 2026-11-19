/** The longest instruction the assistant takes: a WhatsApp-length message, not a document. */
export const INSTRUCTION_MAX = 1000;

/** Requests to the model per person per hour, failures included, so one account cannot tie up a shared model. */
export const TASK_DRAFTS_PER_HOUR = 20;

/** A proposed due date further away than this is dropped as a misreading. */
export const DRAFT_DUE_DAYS_MAX = 366;

/** Days of calendar given to the model, so "next Thursday" can be read off a list rather than worked out. */
export const DRAFT_CALENDAR_DAYS = 21;

/** The browser waits this long for a draft: longer than the slowest model the server allows (AI_TIMEOUT_MS, 120 s at most). */
export const TASK_DRAFT_CLIENT_TIMEOUT_MS = 130_000;
