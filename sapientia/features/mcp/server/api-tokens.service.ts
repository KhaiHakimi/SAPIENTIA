import 'server-only';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { confirmPassword } from '@/features/auth/server/password-check.service';
import { generateToken, hashToken } from '@/features/auth/server/token.service';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ConflictError, NotFoundError } from '@/shared/server/app-errors';
import { getPool, withTransaction } from '@/shared/server/database.service';
import { API_TOKEN_DAYS, API_TOKEN_PREFIX, API_TOKEN_TOUCH_MINUTES, API_TOKENS_MAX } from '../constants/mcp.constants';
import type { ApiTokenList, ApiTokenSummary, NewApiToken, NewApiTokenRequest } from '../interfaces/api-token.interface';
import { type ApiTokenRow, findTokenOwner, insertToken, listActiveTokens, revokeOwnToken, touchToken } from './api-tokens.repository';
import { isMcpEnabled } from './mcp-config.service';

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/**
 * Personal access tokens for the MCP server (plan Phase 6). A token lets an AI assistant read what its owner can read,
 * through the MCP server only, and nothing else: it opens no page and changes nothing. Each person manages only their own.
 */

const toSummary = (row: ApiTokenRow): ApiTokenSummary => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at.toISOString(),
  lastUsedAt: row.last_used_at?.toISOString() ?? null,
  expiresAt: row.expires_at.toISOString(),
});

/**
 * The caller's live tokens, listed even while the MCP server is switched off: a token still works once it is switched back
 * on, so its owner must be able to see and revoke it (a leaked one above all) in the meantime.
 */
export async function listMyTokens(actor: SessionUser, clock: Clock, origin: string): Promise<ApiTokenList> {
  const available = isMcpEnabled();
  const rows = await listActiveTokens(getPool(), actor.schoolId, actor.id, clock.now());
  return { available, endpoint: available ? `${origin}/api/mcp` : null, items: rows.map(toSummary) };
}

/** Asks for the password again (an unattended signed-in screen is not enough), then shows the token once. */
export async function createMyToken(actor: SessionUser, input: NewApiTokenRequest, clock: Clock): Promise<NewApiToken> {
  if (!isMcpEnabled()) throw new NotFoundError();
  await confirmPassword(actor, input.password, clock);
  return withTransaction(async (client) => {
    const now = clock.now();
    // Serialises two creations by the same person, so the limit holds.
    await client.query('SELECT 1 FROM users WHERE school_id = $1 AND id = $2 FOR UPDATE', [actor.schoolId, actor.id]);
    if ((await listActiveTokens(client, actor.schoolId, actor.id, now)).length >= API_TOKENS_MAX) {
      throw new ConflictError('Revoke a token first.', { name: 'too_many_tokens' });
    }
    const token = `${API_TOKEN_PREFIX}${generateToken()}`;
    const row = await insertToken(client, actor.schoolId, actor.id, {
      name: input.name, hash: hashToken(token), now, expiresAt: new Date(now.getTime() + API_TOKEN_DAYS * DAY_MS),
    });
    await writeAudit(client, actor.schoolId, [
      { actorId: actor.id, action: 'api_token.created', entityType: 'user', entityId: actor.id, metadata: { tokenId: row.id } },
    ]);
    return { token, item: toSummary(row) };
  });
}

export async function revokeMyToken(actor: SessionUser, tokenId: string, clock: Clock): Promise<void> {
  await withTransaction(async (client) => {
    if (!(await revokeOwnToken(client, actor.schoolId, actor.id, tokenId, clock.now()))) throw new NotFoundError();
    await writeAudit(client, actor.schoolId, [
      { actorId: actor.id, action: 'api_token.revoked', entityType: 'user', entityId: actor.id, metadata: { tokenId } },
    ]);
  });
}

/** The person a bearer token acts for, or null for anything not a live token of an active account. */
export async function resolveApiToken(token: string, clock: Clock): Promise<SessionUser | null> {
  if (!token.startsWith(API_TOKEN_PREFIX)) return null;
  const db = getPool();
  const now = clock.now();
  const row = await findTokenOwner(db, hashToken(token), now);
  if (!row) return null;
  if (!row.last_used_at || now.getTime() - row.last_used_at.getTime() >= API_TOKEN_TOUCH_MINUTES * MINUTE_MS) {
    await touchToken(db, row.token_id, now);
  }
  return {
    id: row.id, schoolId: row.school_id, schoolName: row.school_name, timeZone: row.time_zone, email: row.email, name: row.name,
    role: row.role, mfaSetupRequired: row.mfa_setup_required,
  };
}
