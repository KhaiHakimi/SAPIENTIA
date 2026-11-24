import 'server-only';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { RateLimitError } from '@/shared/server/app-errors';
import type { Queryable } from '@/shared/server/database.service';
import { THROTTLE_MAX_PER_ADDRESS, THROTTLE_MAX_PER_EMAIL, THROTTLE_WINDOW_MINUTES } from '../constants/session.constants';
import type { ThrottleKeys, ThrottleReservation } from '../interfaces/throttle.interface';

const WINDOW_MS = THROTTLE_WINDOW_MINUTES * 60_000;

/** The throttle key for a staff email. */
export const emailThrottleKey = (email: string) => `email:${email.trim().toLowerCase()}`;

const addressKey = (address: string) => `ip:${address}`;

const keysOf = ({ account, address }: ThrottleKeys) => [
  { key: account, max: THROTTLE_MAX_PER_EMAIL },
  { key: addressKey(address), max: THROTTLE_MAX_PER_ADDRESS },
];

interface CounterRow {
  key: string;
  window_started_at: Date;
  failures: number;
}

/**
 * Adds one to each key's counter in a single statement; a window that has ended starts again at one. Keys are taken in
 * sorted order, so two requests sharing an address always lock the rows the same way round and cannot deadlock.
 */
async function countAttempt(db: Queryable, keys: readonly string[], now: Date): Promise<CounterRow[]> {
  const { rows } = await db.query<CounterRow>(
    `INSERT INTO auth_throttle (key, window_started_at, failures)
       SELECT key, $2, 1 FROM unnest($1::text[]) AS key ORDER BY key
     ON CONFLICT (key) DO UPDATE SET
       failures = CASE WHEN auth_throttle.window_started_at <= $3 THEN 1 ELSE auth_throttle.failures + 1 END,
       window_started_at = CASE WHEN auth_throttle.window_started_at <= $3 THEN $2 ELSE auth_throttle.window_started_at END
     RETURNING key, window_started_at, failures`,
    [[...keys].sort(), now, new Date(now.getTime() - WINDOW_MS)],
  );
  return rows;
}

/** Takes one back from each counter, but only within the window it was counted in, so a new window is never lowered. */
async function giveBack(db: Queryable, counted: readonly CounterRow[]): Promise<void> {
  await db.query(
    `UPDATE auth_throttle t SET failures = t.failures - 1
       FROM unnest($1::text[], $2::timestamptz[]) AS c(key, window_started_at)
      WHERE t.key = c.key AND t.window_started_at = c.window_started_at AND t.failures > 0`,
    [counted.map((row) => row.key), counted.map((row) => row.window_started_at)],
  );
}

/**
 * Counts the attempt as a failure against the account and the address before the password is checked, and refuses it
 * once either is over its limit. Counting first, in one atomic step, is what stops many guesses sent at once from all
 * being checked: each request sees its own count. A refused attempt is given back, so it costs the account nothing, as
 * before. A right password then calls releaseAttempt; a wrong one needs nothing more.
 */
export async function reserveAttempt(db: Queryable, keys: ThrottleKeys, clock: Clock): Promise<ThrottleReservation> {
  const now = clock.now();
  const limits = keysOf(keys);
  const counted = await countAttempt(db, limits.map((limit) => limit.key), now);

  let retryAfterMs = 0;
  for (const row of counted) {
    const max = limits.find((limit) => limit.key === row.key)?.max ?? 0;
    if (row.failures > max) retryAfterMs = Math.max(retryAfterMs, row.window_started_at.getTime() + WINDOW_MS - now.getTime());
  }
  if (retryAfterMs > 0) {
    await giveBack(db, counted);
    throw new RateLimitError(Math.ceil(retryAfterMs / 1000));
  }

  const address = counted.find((row) => row.key === addressKey(keys.address));
  return {
    account: keys.account,
    address: { key: addressKey(keys.address), windowStartedAt: address?.window_started_at ?? now },
  };
}

/**
 * A right password: clears the account's counter, and gives the address back the attempt reserved for it, so the address
 * still counts failures only (it may be a shared school network where many people sign in correctly).
 */
export async function releaseAttempt(db: Queryable, reservation: ThrottleReservation): Promise<void> {
  await clearAccountFailures(db, reservation.account);
  await giveBack(db, [{ key: reservation.address.key, window_started_at: reservation.address.windowStartedAt, failures: 0 }]);
}

/**
 * Refuses the attempt once either the account or the address has failed too often, without counting it. Used by the code
 * step of two-step sign-in, which counts its failures afterwards; password checks use reserveAttempt instead.
 */
export async function assertNotThrottled(db: Queryable, keys: ThrottleKeys, clock: Clock): Promise<void> {
  const now = clock.now().getTime();
  const limits = keysOf(keys);
  const { rows } = await db.query<CounterRow>(
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
  await countAttempt(db, keysOf(keys).map((limit) => limit.key), clock.now());
}

/** A successful sign-in clears the account's counter (not the address's, which may be a shared school network). */
export async function clearAccountFailures(db: Queryable, account: string): Promise<void> {
  await db.query('DELETE FROM auth_throttle WHERE key = $1', [account]);
}
