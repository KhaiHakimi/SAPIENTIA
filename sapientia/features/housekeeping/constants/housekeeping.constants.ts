/** pg-boss cron queue: once an hour the worker removes sign-in rows that can no longer be used. */
export const EXPIRED_ROWS_SWEEP_QUEUE = 'expired-rows-sweep';
export const EXPIRED_ROWS_SWEEP_CRON = '23 * * * *';

/** Rows removed per statement, so no sweep holds locks on a busy sign-in table for long. */
export const EXPIRED_ROWS_BATCH = 1000;
/** Statements per table per sweep; anything left is taken by the next sweep an hour later. */
export const EXPIRED_ROWS_MAX_BATCHES = 50;
