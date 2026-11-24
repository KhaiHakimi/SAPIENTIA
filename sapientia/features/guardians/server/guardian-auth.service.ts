import 'server-only';
import { hashPassword, timingDummyHash, verifyPassword } from '@/features/auth/server/password.service';
import { releaseAttempt, reserveAttempt } from '@/features/auth/server/throttle.service';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { InvalidCredentialsError, NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, type Queryable, withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import type { ChangeGuardianPasswordRequest, GuardianSignInRequest, SessionGuardian } from '../interfaces/guardian.interface';
import { revokeGuardianSessions } from './guardians.repository';
import { createGuardianSession } from './guardian-session.service';

/** Guardian sign-in and the guardian's own password, the same rules as pupils. No sign-in time is stored. */

interface CredentialRow {
  id: string;
  school_id: string;
  status: 'active' | 'disabled';
  password_hash: string;
  starting_password_expires_at: Date | null;
}

/** Guardians have their own throttle counters, apart from staff emails and pupils. */
const guardianThrottleKey = (username: string) => `guardian:${username.trim().toLowerCase()}`;

/**
 * Checks the password and starts a guardian session. An unknown username, a wrong password, a disabled account and an
 * expired slip all give the same error after the same work.
 */
export async function signInGuardian(
  input: GuardianSignInRequest,
  address: string,
  clock: Clock,
  db: Queryable = getPool(),
): Promise<string> {
  const keys = { account: guardianThrottleKey(input.username), address };
  const reservation = await reserveAttempt(db, keys, clock);

  const { rows } = await db.query<CredentialRow>(
    'SELECT id, school_id, status, password_hash, starting_password_expires_at FROM guardians WHERE username = $1',
    [input.username],
  );
  const guardian = rows[0];
  const passwordOk = await verifyPassword(guardian?.password_hash ?? (await timingDummyHash()), input.password);
  const slipExpired = Boolean(guardian?.starting_password_expires_at && guardian.starting_password_expires_at <= clock.now());
  if (!guardian || !passwordOk || guardian.status !== 'active' || slipExpired) {
    logger.info('guardian_auth.sign_in_failed', { guardianId: guardian?.id ?? null });
    throw new InvalidCredentialsError();
  }

  await releaseAttempt(db, reservation);
  logger.info('guardian_auth.signed_in', { guardianId: guardian.id, schoolId: guardian.school_id });
  return createGuardianSession(db, guardian.school_id, guardian.id, clock);
}

/**
 * The guardian replaces their password (the slip's, the first time). A wrong current password counts towards the throttle.
 * Every other session ends, and the caller gets a fresh session token for this browser.
 */
export async function changeGuardianPassword(
  guardian: SessionGuardian,
  input: ChangeGuardianPasswordRequest,
  address: string,
  clock: Clock,
): Promise<string> {
  const db = getPool();
  const keys = { account: guardianThrottleKey(guardian.username), address };
  const reservation = await reserveAttempt(db, keys, clock);

  const { rows } = await db.query<{ password_hash: string }>('SELECT password_hash FROM guardians WHERE school_id = $1 AND id = $2', [
    guardian.schoolId,
    guardian.id,
  ]);
  const stored = rows[0]?.password_hash;
  if (!stored) throw new NotFoundError();
  if (!(await verifyPassword(stored, input.currentPassword))) {
    throw new ValidationError({ currentPassword: 'wrong_password' });
  }
  await releaseAttempt(db, reservation);
  if (input.newPassword === input.currentPassword) throw new ValidationError({ newPassword: 'same_password' });

  const hash = await hashPassword(input.newPassword);
  const token = await withTransaction(async (client) => {
    await client.query(
      `UPDATE guardians SET password_hash = $3, must_change_password = false, starting_password_expires_at = NULL, updated_at = $4
        WHERE school_id = $1 AND id = $2`,
      [guardian.schoolId, guardian.id, hash, clock.now()],
    );
    await revokeGuardianSessions(client, guardian.schoolId, guardian.id);
    return createGuardianSession(client, guardian.schoolId, guardian.id, clock);
  });
  logger.info('guardian_auth.password_changed', { guardianId: guardian.id, schoolId: guardian.schoolId });
  return token;
}
