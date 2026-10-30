import 'server-only';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { InvalidCredentialsError, NotFoundError } from '@/shared/server/app-errors';
import { getPool, type Queryable, withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import type { AcceptInviteRequest, SignInRequest } from '../interfaces/session-user.interface';
import { hashPassword, timingDummyHash, verifyPassword } from './password.service';
import { createSession, revokeUserSessions } from './session.service';
import { assertNotThrottled, clearEmailFailures, recordFailure } from './throttle.service';
import { hashToken } from './token.service';

interface CredentialRow {
  id: string;
  school_id: string;
  status: 'invited' | 'active' | 'disabled';
  password_hash: string | null;
}

/**
 * Checks the password and starts a session. Unknown email, wrong password, an invited or a disabled account all give the
 * same error after the same amount of work, so the response reveals nothing about which accounts exist.
 */
export async function signIn(input: SignInRequest, address: string, clock: Clock, db: Queryable = getPool()): Promise<string> {
  const keys = { email: input.email, address };
  await assertNotThrottled(db, keys, clock);

  const { rows } = await db.query<CredentialRow>(
    'SELECT id, school_id, status, password_hash FROM users WHERE lower(email) = $1',
    [input.email],
  );
  const user = rows[0];
  const passwordOk = await verifyPassword(user?.password_hash ?? (await timingDummyHash()), input.password);
  if (!user || !passwordOk || user.status !== 'active') {
    await recordFailure(db, keys, clock);
    logger.info('auth.sign_in_failed', { userId: user?.id ?? null });
    throw new InvalidCredentialsError();
  }

  await clearEmailFailures(db, input.email);
  await db.query('UPDATE users SET last_sign_in_at = $2 WHERE id = $1', [user.id, clock.now()]);
  logger.info('auth.signed_in', { userId: user.id, schoolId: user.school_id });
  return createSession(db, user.school_id, user.id, clock);
}

/**
 * Uses a one-time invite: sets the password, activates the account and signs the person in. The invite row is locked, so
 * the same link used twice at once still succeeds only once. Any other state is a plain 404.
 */
export async function acceptInvite(input: AcceptInviteRequest, clock: Clock): Promise<string> {
  const passwordHash = await hashPassword(input.password);
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string; school_id: string; user_id: string }>(
      `SELECT i.id, i.school_id, i.user_id
         FROM invites i JOIN users u ON u.id = i.user_id AND u.school_id = i.school_id
        WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > $2 AND u.status <> 'disabled'
        FOR UPDATE OF i`,
      [hashToken(input.token), clock.now()],
    );
    const invite = rows[0];
    if (!invite) throw new NotFoundError('This invite link is not valid. Ask your administrator for a new one.');

    await client.query('UPDATE invites SET used_at = $2 WHERE id = $1', [invite.id, clock.now()]);
    await client.query(
      `UPDATE users SET password_hash = $3, status = 'active', updated_at = $4 WHERE school_id = $1 AND id = $2`,
      [invite.school_id, invite.user_id, passwordHash, clock.now()],
    );
    await revokeUserSessions(client, invite.school_id, invite.user_id);
    logger.info('auth.invite_accepted', { userId: invite.user_id, schoolId: invite.school_id });
    return createSession(client, invite.school_id, invite.user_id, clock);
  });
}
