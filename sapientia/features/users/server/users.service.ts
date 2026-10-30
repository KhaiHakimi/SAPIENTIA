import 'server-only';
import { INVITE_VALID_HOURS } from '@/features/auth/constants/session.constants';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { generateToken, hashToken } from '@/features/auth/server/token.service';
import type { Page } from '@/shared/interfaces/api-error.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ConflictError } from '@/shared/server/app-errors';
import { getPool, withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import { decodeCursor, encodeCursor, toPage } from '@/shared/server/pagination';
import type { InviteUserRequest, InviteUserResult, StaffUser } from '../interfaces/staff-user.interface';
import { findUserByEmail, insertInvitedUser, listUsers, toStaffUser } from './users.repository';

export async function listSchoolUsers(actor: SessionUser, limit: number, cursor: string | undefined): Promise<Page<StaffUser>> {
  const after = decodeCursor(cursor);
  const rows = await listUsers(getPool(), actor.schoolId, limit, after && { name: after.sortValue, id: after.id });
  return toPage(rows, limit, toStaffUser, (row) => encodeCursor(row.name, row.id));
}

/**
 * Creates an invited account, or a fresh link for someone in this school who has not accepted yet (older links stop
 * working). An email already used by an active account, or by another school, is a conflict.
 */
export async function inviteUser(actor: SessionUser, input: InviteUserRequest, origin: string, clock: Clock): Promise<InviteUserResult> {
  const token = generateToken();
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + INVITE_VALID_HOURS * 3_600_000);

  const user = await withTransaction(async (client) => {
    const existing = await findUserByEmail(client, input.email);
    if (existing && (existing.school_id !== actor.schoolId || existing.status !== 'invited')) {
      throw new ConflictError('This email already has an account.', { email: 'taken' });
    }
    const row = existing ?? (await insertInvitedUser(client, actor.schoolId, input));
    await client.query(
      'UPDATE invites SET revoked_at = $3 WHERE school_id = $1 AND user_id = $2 AND used_at IS NULL AND revoked_at IS NULL',
      [actor.schoolId, row.id, now],
    );
    await client.query(
      `INSERT INTO invites (token_hash, school_id, user_id, created_by, created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [hashToken(token), actor.schoolId, row.id, actor.id, now, expiresAt],
    );
    return toStaffUser(row);
  });

  logger.info('users.invited', { userId: user.id, schoolId: actor.schoolId, actorId: actor.id });
  const inviteUrl = `${origin}/accept-invite#token=${encodeURIComponent(token)}`;
  return { user, inviteUrl, expiresAt: expiresAt.toISOString() };
}
