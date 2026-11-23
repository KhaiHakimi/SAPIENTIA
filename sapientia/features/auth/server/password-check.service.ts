import 'server-only';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ValidationError } from '@/shared/server/app-errors';
import { getPool } from '@/shared/server/database.service';
import type { SessionUser } from '../interfaces/session-user.interface';
import { verifyPassword } from './password.service';
import { emailThrottleKey, releaseAttempt, reserveAttempt } from './throttle.service';

/**
 * Asks a signed-in person for their password again before a sensitive change (two-step sign-in, access tokens), so an
 * unattended signed-in screen is not enough. A wrong password counts against the account's sign-in throttle and comes back
 * as the field reason wrong_password.
 */
export async function confirmPassword(actor: SessionUser, password: string, clock: Clock): Promise<void> {
  const db = getPool();
  const keys = { account: emailThrottleKey(actor.email), address: `user:${actor.id}` };
  const reservation = await reserveAttempt(db, keys, clock);
  const { rows } = await db.query<{ password_hash: string | null }>(
    `SELECT password_hash FROM users WHERE school_id = $1 AND id = $2 AND status = 'active'`,
    [actor.schoolId, actor.id],
  );
  const hash = rows[0]?.password_hash;
  if (!hash || !(await verifyPassword(hash, password))) {
    throw new ValidationError({ password: 'wrong_password' });
  }
  await releaseAttempt(db, reservation);
}
