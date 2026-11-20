import 'server-only';
import { writeAudit } from '@/features/audit/server/audit.repository';
import { createSession } from '@/features/auth/server/session.service';
import { assertNotThrottled, clearAccountFailures, recordFailure } from '@/features/auth/server/throttle.service';
import { generateToken, hashToken } from '@/features/auth/server/token.service';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { MfaUnavailableError, UnauthenticatedError, ValidationError } from '@/shared/server/app-errors';
import { getPool, type Queryable, withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import { MFA_CHALLENGE_MAX_ATTEMPTS, MFA_CHALLENGE_MINUTES } from '../constants/mfa.constants';
import type { MfaSignInRequest } from '../interfaces/mfa.interface';
import { decryptSecret, readMfaKey } from './mfa-secret.service';
import {
  countFailedAttempt,
  deleteChallenge,
  findChallengeForUpdate,
  findMfa,
  insertChallenge,
  setLastUsedStep,
  useRecoveryCode,
} from './mfa.repository';
import { hashRecoveryCode } from './recovery-code.service';
import { matchTotp } from './totp.service';

/**
 * The second step of a staff sign-in (plan gate G6). A correct password for an account with an authenticator gives a
 * short-lived challenge, not a session; the session starts only when a current code, or an unused recovery code, matches.
 * Wrong codes count against the challenge (5, then start again) and against the same throttle as passwords.
 */

const throttleKeys = (userId: string, address: string) => ({ account: `mfa:${userId}`, address });

/** True when this account has a confirmed authenticator. */
export async function hasMfa(db: Queryable, schoolId: string, userId: string): Promise<boolean> {
  return Boolean((await findMfa(db, schoolId, userId))?.confirmed_at);
}

/** Starts the code step and returns the raw token for its cookie; only the hash is stored. */
export async function startChallenge(db: Queryable, schoolId: string, userId: string, clock: Clock): Promise<string> {
  const token = generateToken();
  await insertChallenge(db, schoolId, userId, hashToken(token), new Date(clock.now().getTime() + MFA_CHALLENGE_MINUTES * 60_000));
  return token;
}

type Outcome = { kind: 'signed_in'; session: string; userId: string } | { kind: 'wrong'; userId: string } | { kind: 'expired' };

/**
 * Checks the code for the challenge in the cookie. Returns the new session token; 401 when the challenge is unknown, expired
 * or used up (the person signs in again), 400 wrong_code otherwise.
 */
export async function completeChallenge(token: string, input: MfaSignInRequest, address: string, clock: Clock): Promise<string> {
  const key = readMfaKey();
  if (!key) throw new MfaUnavailableError();
  const db = getPool();
  const now = clock.now();

  // Failures are counted in their own commit, so throwing afterwards does not roll the count back.
  const outcome = await withTransaction(async (client): Promise<Outcome> => {
    const challenge = await findChallengeForUpdate(client, hashToken(token));
    if (!challenge || challenge.expires_at <= now || challenge.attempts >= MFA_CHALLENGE_MAX_ATTEMPTS) {
      if (challenge) await deleteChallenge(client, challenge.id);
      return { kind: 'expired' };
    }
    await assertNotThrottled(client, throttleKeys(challenge.user_id, address), clock);
    const mfa = await findMfa(client, challenge.school_id, challenge.user_id, true);
    if (!mfa?.confirmed_at) {
      await deleteChallenge(client, challenge.id);
      return { kind: 'expired' };
    }

    let ok = false;
    if ('code' in input) {
      const lastUsed = mfa.last_used_step === null ? null : Number(mfa.last_used_step);
      const step = matchTotp(decryptSecret(mfa.secret_encrypted, key), input.code, now, lastUsed);
      if (step !== null) {
        await setLastUsedStep(client, challenge.school_id, challenge.user_id, step);
        ok = true;
      }
    } else if (await useRecoveryCode(client, challenge.school_id, challenge.user_id, hashRecoveryCode(input.recoveryCode), now)) {
      await writeAudit(client, challenge.school_id, [{
        actorId: challenge.user_id, action: 'mfa.recovery_code_used', entityType: 'user', entityId: challenge.user_id,
      }]);
      ok = true;
    }

    if (!ok) {
      await countFailedAttempt(client, challenge.id);
      return { kind: 'wrong', userId: challenge.user_id };
    }
    await deleteChallenge(client, challenge.id);
    await client.query('UPDATE users SET last_sign_in_at = $2 WHERE id = $1', [challenge.user_id, now]);
    return { kind: 'signed_in', session: await createSession(client, challenge.school_id, challenge.user_id, clock), userId: challenge.user_id };
  });

  if (outcome.kind === 'expired') throw new UnauthenticatedError();
  if (outcome.kind === 'wrong') {
    await recordFailure(db, throttleKeys(outcome.userId, address), clock);
    logger.info('auth.mfa_failed', { userId: outcome.userId });
    throw new ValidationError({ code: 'wrong_code' });
  }
  await clearAccountFailures(db, `mfa:${outcome.userId}`);
  logger.info('auth.signed_in', { userId: outcome.userId, mfa: true });
  return outcome.session;
}
