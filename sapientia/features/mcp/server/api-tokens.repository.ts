import 'server-only';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { Queryable } from '@/shared/server/database.service';

/** Access token rows. Every function but findTokenOwner takes schoolId first and filters on it. */

export interface ApiTokenRow {
  id: string;
  name: string;
  created_at: Date;
  last_used_at: Date | null;
  expires_at: Date;
}

/** Tokens still usable: not revoked and not expired. */
export async function listActiveTokens(db: Queryable, schoolId: string, userId: string, now: Date): Promise<ApiTokenRow[]> {
  const { rows } = await db.query<ApiTokenRow>(
    `SELECT id, name, created_at, last_used_at, expires_at FROM api_tokens
      WHERE school_id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > $3
      ORDER BY created_at DESC, id`,
    [schoolId, userId, now],
  );
  return rows;
}

export async function insertToken(
  db: Queryable,
  schoolId: string,
  userId: string,
  token: { name: string; hash: Buffer; now: Date; expiresAt: Date },
): Promise<ApiTokenRow> {
  const { rows } = await db.query<ApiTokenRow>(
    `INSERT INTO api_tokens (school_id, user_id, name, token_hash, created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, created_at, last_used_at, expires_at`,
    [schoolId, userId, token.name, token.hash, token.now, token.expiresAt],
  );
  return rows[0];
}

/** Revokes one of this person's own tokens; false when there is no such active token of theirs. */
export async function revokeOwnToken(db: Queryable, schoolId: string, userId: string, tokenId: string, now: Date): Promise<boolean> {
  const { rowCount } = await db.query(
    'UPDATE api_tokens SET revoked_at = $4 WHERE school_id = $1 AND user_id = $2 AND id = $3 AND revoked_at IS NULL',
    [schoolId, userId, tokenId, now],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * The person behind a token hash, with the same account checks as a browser session: the account must be active and not
 * removed. Revoked and expired tokens find no one.
 */
export async function findTokenOwner(db: Queryable, hash: Buffer, now: Date) {
  const { rows } = await db.query<{
    token_id: string; last_used_at: Date | null; id: string; school_id: string; school_name: string; time_zone: string; email: string;
    name: string; role: SessionUser['role']; mfa_setup_required: boolean;
  }>(
    `SELECT t.id AS token_id, t.last_used_at, u.id, u.school_id, sc.name AS school_name, sc.time_zone, u.email, u.name, u.role,
            (u.role = 'admin' AND sc.require_admin_mfa AND NOT EXISTS (
              SELECT 1 FROM user_mfa m WHERE m.user_id = u.id AND m.confirmed_at IS NOT NULL
            )) AS mfa_setup_required
       FROM api_tokens t
       JOIN users u ON u.id = t.user_id AND u.school_id = t.school_id
       JOIN schools sc ON sc.id = u.school_id
      WHERE t.token_hash = $1 AND t.revoked_at IS NULL AND t.expires_at > $2 AND u.status = 'active' AND u.removed_at IS NULL`,
    [hash, now],
  );
  return rows[0] ?? null;
}

export async function touchToken(db: Queryable, tokenId: string, now: Date): Promise<void> {
  await db.query('UPDATE api_tokens SET last_used_at = $2 WHERE id = $1', [tokenId, now]);
}
