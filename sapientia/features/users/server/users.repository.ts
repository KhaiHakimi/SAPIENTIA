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
}

export const toStaffUser = (row: UserRow): StaffUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
  lastSignInAt: row.last_sign_in_at?.toISOString() ?? null,
  removed: row.removed_at !== null,
});

export async function listUsers(db: Queryable, schoolId: string, limit: number, after: { name: string; id: string } | null) {
  const { rows } = await db.query<UserRow>(
    `SELECT id, name, email, role, status, last_sign_in_at, removed_at FROM users
      WHERE school_id = $1 AND ($2::text IS NULL OR (name, id) > ($2, $3::uuid))
      ORDER BY name, id LIMIT $4`,
    [schoolId, after?.name ?? null, after?.id ?? null, limit + 1],
  );
  return rows;
}

export async function findUserByEmail(db: Queryable, email: string) {
  const { rows } = await db.query<UserRow & { school_id: string }>(
    'SELECT id, school_id, name, email, role, status, last_sign_in_at, removed_at FROM users WHERE lower(email) = lower($1)',
    [email],
  );
  return rows[0] ?? null;
}

export async function insertInvitedUser(db: Queryable, schoolId: string, input: { email: string; name: string; role: StaffRole }) {
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (school_id, email, name, role, status) VALUES ($1, $2, $3, $4, 'invited')
     RETURNING id, name, email, role, status, last_sign_in_at, removed_at`,
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

/** One of the school's accounts that has not been removed, locked until the transaction ends. */
export async function findUserForUpdate(db: Queryable, schoolId: string, id: string) {
  const { rows } = await db.query<UserRow & { has_password: boolean }>(
    `SELECT id, name, email, role, status, last_sign_in_at, removed_at, (password_hash IS NOT NULL) AS has_password FROM users
      WHERE school_id = $1 AND id = $2 AND removed_at IS NULL
      FOR UPDATE`,
    [schoolId, id],
  );
  return rows[0] ?? null;
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
