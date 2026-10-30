import 'server-only';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { RateLimitError } from '@/shared/server/app-errors';
import type { Queryable } from '@/shared/server/database.service';
import { THROTTLE_MAX_PER_ADDRESS, THROTTLE_MAX_PER_EMAIL, THROTTLE_WINDOW_MINUTES } from '../constants/session.constants';

const WINDOW_MS = THROTTLE_WINDOW_MINUTES * 60_000;

export interface ThrottleKeys {
  email: string;
  address: string;
}

const keysOf = ({ email, address }: ThrottleKeys) => [
  { key: `email:${email.trim().toLowerCase()}`, max: THROTTLE_MAX_PER_EMAIL },
  { key: `ip:${address}`, max: THROTTLE_MAX_PER_ADDRESS },
];

/** Refuses the attempt before the password is checked once either the account or the address has failed too often. */
export async function assertNotThrottled(db: Queryable, keys: ThrottleKeys, clock: Clock): Promise<void> {
  const now = clock.now().getTime();
  const limits = keysOf(keys);
  const { rows } = await db.query<{ key: string; window_started_at: Date; failures: number }>(
    'SELECT key, window_started_at, failures FROM auth_throttle WHERE key = ANY($1)',
    [limits.map((limit) => limit.key)],
  );
  for (const row of rows) {
    const max = limits.find((limit) => limit.key === row.key)?.max ?? 0;
    const windowEnds = row.window_started_at.getTime() + WINDOW_MS;
    if (now < windowEnds && row.failures >= max) throw new RateLimitError(Math.ceil((windowEnds - now) / 1000));
  }
}

/** Counts a failure against both keys; a window that has ended starts again at one. */
export async function recordFailure(db: Queryable, keys: ThrottleKeys, clock: Clock): Promise<void> {
  const now = clock.now();
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  for (const { key } of keysOf(keys)) {
    await db.query(
      `INSERT INTO auth_throttle (key, window_started_at, failures) VALUES ($1, $2, 1)
       ON CONFLICT (key) DO UPDATE SET
         failures = CASE WHEN auth_throttle.window_started_at <= $3 THEN 1 ELSE auth_throttle.failures + 1 END,
         window_started_at = CASE WHEN auth_throttle.window_started_at <= $3 THEN $2 ELSE auth_throttle.window_started_at END`,
      [key, now, windowStart],
    );
  }
}

/** A successful sign-in clears the account's counter (not the address's, which may be a shared school network). */
export async function clearEmailFailures(db: Queryable, email: string): Promise<void> {
  await db.query('DELETE FROM auth_throttle WHERE key = $1', [`email:${email.trim().toLowerCase()}`]);
}
