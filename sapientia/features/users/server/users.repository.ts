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
}

export const toStaffUser = (row: UserRow): StaffUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
  lastSignInAt: row.last_sign_in_at?.toISOString() ?? null,
});

export async function listUsers(db: Queryable, schoolId: string, limit: number, after: { name: string; id: string } | null) {
  const { rows } = await db.query<UserRow>(
    `SELECT id, name, email, role, status, last_sign_in_at FROM users
      WHERE school_id = $1 AND ($2::text IS NULL OR (name, id) > ($2, $3::uuid))
      ORDER BY name, id LIMIT $4`,
    [schoolId, after?.name ?? null, after?.id ?? null, limit + 1],
  );
  return rows;
}

export async function findUserByEmail(db: Queryable, email: string) {
  const { rows } = await db.query<UserRow & { school_id: string }>(
    'SELECT id, school_id, name, email, role, status, last_sign_in_at FROM users WHERE lower(email) = lower($1)',
    [email],
  );
  return rows[0] ?? null;
}

export async function insertInvitedUser(db: Queryable, schoolId: string, input: { email: string; name: string; role: StaffRole }) {
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (school_id, email, name, role, status) VALUES ($1, $2, $3, $4, 'invited')
     RETURNING id, name, email, role, status, last_sign_in_at`,
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
