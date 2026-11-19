import 'server-only';
import type { PoolClient } from 'pg';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { confirmPassword } from '@/features/auth/server/password-check.service';
import { revokeUserSessions } from '@/features/auth/server/session.service';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ConflictError, MfaUnavailableError, NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import { RECOVERY_CODE_COUNT } from '../constants/mfa.constants';
import type { MfaRecoveryCodes, MfaSetup, MfaStatus } from '../interfaces/mfa.interface';
import { decryptSecret, encryptSecret, readMfaKey } from './mfa-secret.service';
import {
  confirmMfa,
  countRecoveryCodesLeft,
  deleteMfa,
  findMfa,
  findSchoolRequirement,
  replaceRecoveryCodes,
  setSchoolRequirement,
  upsertPendingMfa,
} from './mfa.repository';
import { generateRecoveryCode, hashRecoveryCode } from './recovery-code.service';
import { generateTotpSecret, matchTotp, otpauthUri, toBase32 } from './totp.service';

/**
 * Two-step sign-in for staff (plan gate G6). Any member of staff may add an authenticator app; a school may require it for
 * administrators. Changing it asks for the password again, so an unattended signed-in screen is not enough. Audit entries
 * carry ids only.
 */

function requireKey(): Buffer {
  const key = readMfaKey();
  if (!key) throw new MfaUnavailableError();
  return key;
}

async function newRecoveryCodes(client: PoolClient, actor: SessionUser): Promise<string[]> {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => generateRecoveryCode());
  await replaceRecoveryCodes(client, actor.schoolId, actor.id, codes.map(hashRecoveryCode));
  return codes;
}

export async function getMfaStatus(actor: SessionUser): Promise<MfaStatus> {
  const db = getPool();
  const row = await findMfa(db, actor.schoolId, actor.id);
  const enabled = Boolean(row?.confirmed_at);
  return {
    available: readMfaKey() !== null,
    enabled,
    recoveryCodesLeft: enabled ? await countRecoveryCodesLeft(db, actor.schoolId, actor.id) : 0,
    requiredForAdmins: await findSchoolRequirement(db, actor.schoolId),
  };
}

/** Starts setup: a new secret, kept encrypted until the first code confirms it. 409 if an authenticator is already on. */
export async function startMfaSetup(actor: SessionUser, password: string, clock: Clock): Promise<MfaSetup> {
  const key = requireKey();
  await confirmPassword(actor, password, clock);
  const secret = generateTotpSecret();
  if (!(await upsertPendingMfa(getPool(), actor.schoolId, actor.id, encryptSecret(secret, key), clock.now()))) {
    throw new ConflictError('Two-step sign-in is already on.', { password: 'already_enabled' });
  }
  return { key: toBase32(secret).match(/.{1,4}/g)?.join(' ') ?? '', otpauthUri: otpauthUri(secret, actor.email, actor.schoolName) };
}

/** The first code from the app turns two-step sign-in on and gives the recovery codes, shown once. */
export async function confirmMfaSetup(actor: SessionUser, code: string, clock: Clock): Promise<MfaRecoveryCodes> {
  const key = requireKey();
  const result = await withTransaction(async (client) => {
    const row = await findMfa(client, actor.schoolId, actor.id, true);
    if (!row || row.confirmed_at) throw new ConflictError('Start the setup again.', { code: 'setup_not_started' });
    const step = matchTotp(decryptSecret(row.secret_encrypted, key), code, clock.now(), null);
    if (step === null) return null;
    await confirmMfa(client, actor.schoolId, actor.id, step, clock.now());
    const recoveryCodes = await newRecoveryCodes(client, actor);
    await writeAudit(client, actor.schoolId, [{ actorId: actor.id, action: 'mfa.enabled', entityType: 'user', entityId: actor.id }]);
    return { recoveryCodes };
  });
  if (!result) throw new ValidationError({ code: 'wrong_code' });
  logger.info('mfa.enabled', { userId: actor.id, schoolId: actor.schoolId });
  return result;
}

/** New recovery codes; the old ones stop working. */
export async function replaceMyRecoveryCodes(actor: SessionUser, password: string, clock: Clock): Promise<MfaRecoveryCodes> {
  await confirmPassword(actor, password, clock);
  return withTransaction(async (client) => {
    const row = await findMfa(client, actor.schoolId, actor.id, true);
    if (!row?.confirmed_at) throw new ConflictError('Two-step sign-in is not on.', { password: 'not_enabled' });
    const recoveryCodes = await newRecoveryCodes(client, actor);
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: 'mfa.recovery_codes_replaced', entityType: 'user', entityId: actor.id,
    }]);
    return { recoveryCodes };
  });
}

/** Turns it off. An administrator cannot while the school requires it (409). */
export async function disableMyMfa(actor: SessionUser, password: string, clock: Clock): Promise<void> {
  await confirmPassword(actor, password, clock);
  await withTransaction(async (client) => {
    if (actor.role === 'admin' && (await findSchoolRequirement(client, actor.schoolId))) {
      throw new ConflictError('The school requires two-step sign-in for administrators.', { password: 'required_for_admins' });
    }
    if (!(await deleteMfa(client, actor.schoolId, actor.id))) throw new ConflictError('Two-step sign-in is not on.', { password: 'not_enabled' });
    await writeAudit(client, actor.schoolId, [{ actorId: actor.id, action: 'mfa.disabled', entityType: 'user', entityId: actor.id }]);
  });
}

/**
 * An administrator requires two-step sign-in for every administrator of the school, or stops requiring it. They must have it
 * on themselves first, so turning the rule on never locks out the person doing it.
 */
export async function setAdminMfaRequirement(actor: SessionUser, required: boolean): Promise<MfaStatus> {
  await withTransaction(async (client) => {
    const own = await findMfa(client, actor.schoolId, actor.id);
    if (required && !own?.confirmed_at) {
      throw new ConflictError('Turn on two-step sign-in for yourself first.', { requiredForAdmins: 'enrol_first' });
    }
    await setSchoolRequirement(client, actor.schoolId, required);
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: required ? 'school.mfa_required' : 'school.mfa_optional', entityType: 'school', entityId: actor.schoolId,
    }]);
  });
  return getMfaStatus(actor);
}

/**
 * An administrator clears a colleague's authenticator (a lost phone). The colleague is signed out everywhere and signs in
 * again with their password; an administrator in a school that requires it is then asked to set it up again.
 */
export async function resetUserMfa(actor: SessionUser, userId: string): Promise<void> {
  if (userId === actor.id) throw new ConflictError('Use your own security page.', { status: 'self' });
  await withTransaction(async (client) => {
    if (!(await deleteMfa(client, actor.schoolId, userId))) throw new NotFoundError();
    await revokeUserSessions(client, actor.schoolId, userId);
    await writeAudit(client, actor.schoolId, [{ actorId: actor.id, action: 'mfa.reset', entityType: 'user', entityId: userId }]);
  });
  logger.info('mfa.reset', { userId, schoolId: actor.schoolId, actorId: actor.id });
}
