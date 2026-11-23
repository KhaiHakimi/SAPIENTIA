import 'server-only';
import type { StaffRole, StaffStatus } from '@/features/auth/interfaces/session-user.interface';
import type { Queryable } from '@/shared/server/database.service';
import type { StaffMember, StaffUser } from '../interfaces/staff-user.interface';

/** Every function takes schoolId first and filters on it: no query in this file can reach another school (plan Sprint 3). */

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  last_sign_in_at: Date | null;
  removed_at: Date | null;
  mfa_enabled: boolean;
}

export const toStaffUser = (row: UserRow): StaffUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
  lastSignInAt: row.last_sign_in_at?.toISOString() ?? null,
  removed: row.removed_at !== null,
  mfaEnabled: row.mfa_enabled,
});

export async function listUsers(db: Queryable, schoolId: string, limit: number, after: { name: string; id: string } | null) {
  const { rows } = await db.query<UserRow>(
    `SELECT id, name, email, role, status, last_sign_in_at, removed_at,
            EXISTS (SELECT 1 FROM user_mfa m WHERE m.user_id = users.id AND m.confirmed_at IS NOT NULL) AS mfa_enabled FROM users
      WHERE school_id = $1 AND ($2::text IS NULL OR (name, id) > ($2, $3::uuid))
      ORDER BY name, id LIMIT $4`,
    [schoolId, after?.name ?? null, after?.id ?? null, limit + 1],
  );
  return rows;
}

/** The account with this email in any school, locked until the transaction ends so two invites for it take turns. */
export async function findUserByEmailForUpdate(db: Queryable, email: string) {
  const { rows } = await db.query<UserRow & { school_id: string }>(
    `SELECT id, school_id, name, email, role, status, last_sign_in_at, removed_at,
            EXISTS (SELECT 1 FROM user_mfa m WHERE m.user_id = users.id AND m.confirmed_at IS NOT NULL) AS mfa_enabled FROM users WHERE lower(email) = lower($1)
      FOR UPDATE`,
    [email],
  );
  return rows[0] ?? null;
}

export async function insertInvitedUser(db: Queryable, schoolId: string, input: { email: string; name: string; role: StaffRole }) {
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (school_id, email, name, role, status) VALUES ($1, $2, $3, $4, 'invited')
     RETURNING id, name, email, role, status, last_sign_in_at, removed_at, false AS mfa_enabled`,
    [schoolId, input.email, input.name, input.role],
  );
  return rows[0];
}

/** Active staff for assignment pickers, optionally limited to some ids (to check that assignees belong to the school). */
export async function listActiveStaff(db: Queryable, schoolId: string, ids?: readonly string[]): Promise<StaffMember[]> {
  const { rows } = await db.query<StaffMember>(
    `SELECT id, name, role FROM users
      WHERE school_id = $1 AND status = 'active' AND ($2::uuid[] IS NULL OR id = ANY($2::uuid[]))
      ORDER BY name, id`,
    [schoolId, ids ?? null],
  );
  return rows;
}

/**
 * Some of the school's accounts, removed ones included, locked until the transaction ends. They are locked in id order, so
 * two transactions locking the same pair never wait on each other in a circle.
 */
export async function findUsersForUpdate(db: Queryable, schoolId: string, ids: readonly string[]) {
  const { rows } = await db.query<UserRow & { has_password: boolean }>(
    `SELECT id, name, email, role, status, last_sign_in_at, removed_at, (password_hash IS NOT NULL) AS has_password,
            EXISTS (SELECT 1 FROM user_mfa m WHERE m.user_id = users.id AND m.confirmed_at IS NOT NULL) AS mfa_enabled FROM users
      WHERE school_id = $1 AND id = ANY($2::uuid[])
      ORDER BY id
      FOR UPDATE`,
    [schoolId, ids],
  );
  return rows;
}

/** A still-invited account's new name and role, when the administrator invites the same email again. */
export async function updateInvitedUser(db: Queryable, schoolId: string, id: string, input: { name: string; role: StaffRole }, now: Date) {
  const { rows } = await db.query<UserRow>(
    `UPDATE users SET name = $3, role = $4, updated_at = $5 WHERE school_id = $1 AND id = $2 AND status = 'invited'
     RETURNING id, name, email, role, status, last_sign_in_at, removed_at, false AS mfa_enabled`,
    [schoolId, id, input.name, input.role, now],
  );
  return rows[0];
}


export async function setUserStatus(db: Queryable, schoolId: string, id: string, status: StaffStatus, now: Date): Promise<void> {
  await db.query('UPDATE users SET status = $3, updated_at = $4 WHERE school_id = $1 AND id = $2', [schoolId, id, status, now]);
}

/**
 * Removes a login for good while keeping the row, so records keep the name: the email becomes a placeholder (freeing the
 * address for a new invite), and the password, sign-in time and devices go. Unused invites stop working.
 */
export async function markUserRemoved(db: Queryable, schoolId: string, id: string, now: Date): Promise<void> {
  await db.query(
    `UPDATE users SET status = 'disabled', removed_at = $3, updated_at = $3, password_hash = NULL, last_sign_in_at = NULL,
            email = 'removed-' || id::text || '@removed.invalid', notify_by_email = false
      WHERE school_id = $1 AND id = $2`,
    [schoolId, id, now],
  );
  await db.query('UPDATE invites SET revoked_at = $3 WHERE school_id = $1 AND user_id = $2 AND used_at IS NULL AND revoked_at IS NULL', [schoolId, id, now]);
  await db.query('DELETE FROM push_subscriptions WHERE school_id = $1 AND user_id = $2', [schoolId, id]);
}
