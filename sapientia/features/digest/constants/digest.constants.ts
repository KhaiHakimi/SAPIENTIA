/** pg-boss cron queue: every 15 minutes the worker sends any digests that have come due. */
export const DIGEST_SWEEP_QUEUE = 'weekly-digest-sweep';
export const DIGEST_SWEEP_CRON = '*/15 * * * *';

/** Each list in the email stops here and says how many more there are; the board has the rest. */
export const DIGEST_LIST_MAX = 10;
