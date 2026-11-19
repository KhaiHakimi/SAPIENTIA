import 'server-only';
import type { Queryable } from '@/shared/server/database.service';

/** Two-step sign-in rows. Every function takes schoolId first and filters on it. */

export interface MfaRow {
  secret_encrypted: Buffer;
  confirmed_at: Date | null;
  last_used_step: string | null;
}

/** The account's authenticator row (confirmed or still being set up), locked when asked. */
export async function findMfa(db: Queryable, schoolId: string, userId: string, forUpdate = false): Promise<MfaRow | null> {
  const { rows } = await db.query<MfaRow>(
    `SELECT secret_encrypted, confirmed_at, last_used_step::text AS last_used_step FROM user_mfa
      WHERE school_id = $1 AND user_id = $2${forUpdate ? ' FOR UPDATE' : ''}`,
    [schoolId, userId],
  );
  return rows[0] ?? null;
}

/** Starts (or restarts) setup with a new secret. A confirmed authenticator is never replaced here: returns false. */
export async function upsertPendingMfa(db: Queryable, schoolId: string, userId: string, secretEncrypted: Buffer, now: Date) {
  const result = await db.query(
    `INSERT INTO user_mfa (user_id, school_id, secret_encrypted, created_at) VALUES ($2, $1, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET secret_encrypted = EXCLUDED.secret_encrypted, created_at = EXCLUDED.created_at,
       last_used_step = NULL
     WHERE user_mfa.confirmed_at IS NULL AND user_mfa.school_id = $1`,
    [schoolId, userId, secretEncrypted, now],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function confirmMfa(db: Queryable, schoolId: string, userId: string, step: number, now: Date): Promise<void> {
  await db.query(
    'UPDATE user_mfa SET confirmed_at = $3, last_used_step = $4 WHERE school_id = $1 AND user_id = $2',
    [schoolId, userId, now, step],
  );
}

/** Records the step a code was used in, so it cannot be used again. */
export async function setLastUsedStep(db: Queryable, schoolId: string, userId: string, step: number): Promise<void> {
  await db.query('UPDATE user_mfa SET last_used_step = $3 WHERE school_id = $1 AND user_id = $2', [schoolId, userId, step]);
}

/** Removes the authenticator and its recovery codes. Returns whether there was one. */
export async function deleteMfa(db: Queryable, schoolId: string, userId: string): Promise<boolean> {
  await db.query('DELETE FROM user_mfa_recovery_codes WHERE school_id = $1 AND user_id = $2', [schoolId, userId]);
  const result = await db.query('DELETE FROM user_mfa WHERE school_id = $1 AND user_id = $2', [schoolId, userId]);
  return (result.rowCount ?? 0) > 0;
}

/** Replaces every recovery code with these hashes. */
export async function replaceRecoveryCodes(db: Queryable, schoolId: string, userId: string, hashes: readonly Buffer[]): Promise<void> {
  await db.query('DELETE FROM user_mfa_recovery_codes WHERE school_id = $1 AND user_id = $2', [schoolId, userId]);
  await db.query(
    `INSERT INTO user_mfa_recovery_codes (school_id, user_id, code_hash) SELECT $1, $2, unnest($3::bytea[])`,
    [schoolId, userId, hashes],
  );
}

export async function countRecoveryCodesLeft(db: Queryable, schoolId: string, userId: string): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    'SELECT count(*)::int AS total FROM user_mfa_recovery_codes WHERE school_id = $1 AND user_id = $2 AND used_at IS NULL',
    [schoolId, userId],
  );
  return rows[0].total;
}

/** Uses one recovery code: true only if it matched one not used before. */
export async function useRecoveryCode(db: Queryable, schoolId: string, userId: string, hash: Buffer, now: Date): Promise<boolean> {
  const result = await db.query(
    `UPDATE user_mfa_recovery_codes SET used_at = $4
      WHERE id = (SELECT id FROM user_mfa_recovery_codes
                   WHERE school_id = $1 AND user_id = $2 AND code_hash = $3 AND used_at IS NULL
                   LIMIT 1 FOR UPDATE)`,
    [schoolId, userId, hash, now],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function findSchoolRequirement(db: Queryable, schoolId: string): Promise<boolean> {
  const { rows } = await db.query<{ require_admin_mfa: boolean }>('SELECT require_admin_mfa FROM schools WHERE id = $1', [schoolId]);
  return rows[0]?.require_admin_mfa ?? false;
}

export async function setSchoolRequirement(db: Queryable, schoolId: string, required: boolean): Promise<void> {
  await db.query('UPDATE schools SET require_admin_mfa = $2 WHERE id = $1', [schoolId, required]);
}

export async function findPasswordHash(db: Queryable, schoolId: string, userId: string): Promise<string | null> {
  const { rows } = await db.query<{ password_hash: string | null }>(
    `SELECT password_hash FROM users WHERE school_id = $1 AND id = $2 AND status = 'active'`,
    [schoolId, userId],
  );
  return rows[0]?.password_hash ?? null;
}

export interface ChallengeRow {
  id: string;
  school_id: string;
  user_id: string;
  attempts: number;
  expires_at: Date;
}

/** One sign-in waiting for its code. Older ones for the same account are dropped first. */
export async function insertChallenge(db: Queryable, schoolId: string, userId: string, tokenHash: Buffer, expiresAt: Date) {
  await db.query('DELETE FROM mfa_challenges WHERE school_id = $1 AND user_id = $2', [schoolId, userId]);
  await db.query(
    'INSERT INTO mfa_challenges (token_hash, school_id, user_id, expires_at) VALUES ($1, $2, $3, $4)',
    [tokenHash, schoolId, userId, expiresAt],
  );
}

/** The challenge behind a token, for an account still active, locked until the transaction ends. */
export async function findChallengeForUpdate(db: Queryable, tokenHash: Buffer): Promise<ChallengeRow | null> {
  const { rows } = await db.query<ChallengeRow>(
    `SELECT c.id, c.school_id, c.user_id, c.attempts, c.expires_at
       FROM mfa_challenges c
       JOIN users u ON u.id = c.user_id AND u.school_id = c.school_id AND u.status = 'active'
      WHERE c.token_hash = $1
      FOR UPDATE OF c`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function countFailedAttempt(db: Queryable, challengeId: string): Promise<void> {
  await db.query('UPDATE mfa_challenges SET attempts = attempts + 1 WHERE id = $1', [challengeId]);
}

export async function deleteChallenge(db: Queryable, challengeId: string): Promise<void> {
  await db.query('DELETE FROM mfa_challenges WHERE id = $1', [challengeId]);
}
