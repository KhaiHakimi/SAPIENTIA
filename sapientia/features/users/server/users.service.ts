import 'server-only';
import { DateTime } from 'luxon';
import type { PoolClient } from 'pg';
import { INVITE_VALID_HOURS } from '@/features/auth/constants/session.constants';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { generateToken, hashToken } from '@/features/auth/server/token.service';
import type { Page } from '@/shared/interfaces/api-error.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { type AuditEntry, writeAudit } from '@/features/audit/server/audit.repository';
import { revokeUserSessions } from '@/features/auth/server/session.service';
import { deleteAllOwnEntries } from '@/features/hours/server/hours.repository';
import { cancelPendingForTeacher } from '@/features/meetings/server/meetings.repository';
import { deleteReliefToCome } from '@/features/relief/server/relief.repository';
import { ConflictError, NotFoundError, UnauthenticatedError } from '@/shared/server/app-errors';
import { getPool, withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import { decodeCursor, encodeCursor, toPage } from '@/shared/server/pagination';
import type { InviteUserRequest, InviteUserResult, StaffUser, UpdateUserStatusRequest } from '../interfaces/staff-user.interface';
import {
  findUserByEmailForUpdate,
  findUsersForUpdate,
  insertInvitedUser,
  listUsers,
  markUserRemoved,
  setUserStatus,
  toStaffUser,
  updateInvitedUser,
} from './users.repository';

export async function listSchoolUsers(actor: SessionUser, limit: number, cursor: string | undefined): Promise<Page<StaffUser>> {
  const after = decodeCursor(cursor);
  const rows = await listUsers(getPool(), actor.schoolId, limit, after && { name: after.sortValue, id: after.id });
  return toPage(rows, limit, toStaffUser, (row) => encodeCursor(row.name, row.id));
}

/**
 * Creates an invited account, or a fresh link for someone in this school who has not accepted yet (older links stop
 * working, and the new name and role replace the old). An email already used by an active account, or by another school,
 * is a conflict. The existing row is locked, so two invites sent at once still leave only one link open.
 */
export async function inviteUser(actor: SessionUser, input: InviteUserRequest, origin: string, clock: Clock): Promise<InviteUserResult> {
  const token = generateToken();
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + INVITE_VALID_HOURS * 3_600_000);

  const user = await withTransaction(async (client) => {
    const existing = await findUserByEmailForUpdate(client, input.email);
    if (existing && (existing.school_id !== actor.schoolId || existing.status !== 'invited')) {
      throw new ConflictError('This email already has an account.', { email: 'taken' });
    }
    const row = existing ?
        await updateInvitedUser(client, actor.schoolId, existing.id, input, now) :
        await insertInvitedUser(client, actor.schoolId, input);
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

/**
 * Staff logins beneath the school (plan Phase 4, Sprint 14). An administrator may not change their own login (409). Since
 * the one acting is always an active administrator, this also means the school can never be left without one. The actor's
 * row is locked with the target's and checked again: two administrators disabling each other at once would otherwise both
 * pass the sign-in check made before either change, and leave the school with none. The second one now finds itself
 * signed out (401).
 */
async function lockChangeable(client: PoolClient, actor: SessionUser, id: string) {
  if (id === actor.id) throw new ConflictError('You cannot change your own login.', { status: 'self' });
  const rows = await findUsersForUpdate(client, actor.schoolId, [actor.id, id]);
  const self = rows.find((row) => row.id === actor.id);
  if (!self || self.removed_at || self.status !== 'active' || self.role !== 'admin') throw new UnauthenticatedError();
  const user = rows.find((row) => row.id === id && !row.removed_at);
  if (!user) throw new NotFoundError();
  return user;
}

/**
 * Disables a login (it signs them out at once and stops sign-in and invites) or enables it again. A login that never set a
 * password goes back to invited. Reversible; removing is the permanent step.
 */
export async function updateUserStatus(actor: SessionUser, id: string, input: UpdateUserStatusRequest, clock: Clock): Promise<StaffUser> {
  return withTransaction(async (client) => {
    const user = await lockChangeable(client, actor, id);
    const status = input.status === 'active' && !user.has_password ? 'invited' : input.status;
    if (status === user.status) return toStaffUser(user);
    await setUserStatus(client, actor.schoolId, id, status, clock.now());
    if (status === 'disabled') await revokeUserSessions(client, actor.schoolId, id);
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: status === 'disabled' ? 'user.disabled' : 'user.enabled', entityType: 'user', entityId: id,
    }]);
    return toStaffUser({ ...user, status });
  });
}

/**
 * Removes a login for good: access ends at once (sessions, invites, devices) and the person can never sign in with it again.
 * The row stays so tasks, homework and records keep the name as former staff; the email is replaced so it can be invited
 * afresh, and the private hours log is deleted. Meeting requests still waiting for them are cancelled, and so is relief
 * they were to cover that is not over yet (each audited as a cancelled relief), so those periods show as uncovered again.
 * Relief already over is history and stays.
 */
export async function removeUser(actor: SessionUser, id: string, clock: Clock): Promise<void> {
  const now = clock.now();
  await withTransaction(async (client) => {
    await lockChangeable(client, actor, id);
    await revokeUserSessions(client, actor.schoolId, id);
    await markUserRemoved(client, actor.schoolId, id, now);
    // The private hours log is the teacher's own and goes with the login.
    await deleteAllOwnEntries(client, actor.schoolId, id);
    const meetingsCancelled = await cancelPendingForTeacher(client, actor.schoolId, id, now);
    const local = DateTime.fromJSDate(now, { zone: actor.timeZone });
    const reliefCancelled = await deleteReliefToCome(client, actor.schoolId, id, local.toISODate() ?? '', local.toFormat('HH:mm'));
    await writeAudit(client, actor.schoolId, [
      ...reliefCancelled.map((relief): AuditEntry => ({
        actorId: actor.id, action: 'relief.cancelled', entityType: 'relief_assignment', entityId: relief.id,
        metadata: { slotId: relief.slot_id, onDate: relief.on_date, reliefTeacherId: id, reason: 'relief_teacher_removed' },
      })),
      {
        actorId: actor.id, action: 'user.removed', entityType: 'user', entityId: id,
        metadata: { meetingsCancelled, reliefCancelled: reliefCancelled.length },
      },
    ]);
  });
  logger.info('users.removed', { userId: id, schoolId: actor.schoolId, actorId: actor.id });
}
