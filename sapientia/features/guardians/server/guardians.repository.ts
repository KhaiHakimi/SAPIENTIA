import 'server-only';
import type { StudentStatus } from '@/features/students/interfaces/student.interface';
import type { Queryable } from '@/shared/server/database.service';
import type {
  GuardianLink,
  GuardianRelationship,
  LinkRefusalReason,
  LinkRemovalReason,
  LinkStatus,
  SchoolGuardian,
} from '../interfaces/guardian.interface';

/** Every function takes schoolId first and filters on it, so no query here can reach another school's guardians or pupils. */

export interface GuardianRow {
  id: string;
  name: string;
  username: string;
  status: StudentStatus;
  must_change_password: boolean;
}

interface LinkRow {
  id: string;
  guardian_id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  relationship: GuardianRelationship;
  status: LinkStatus;
  end_reason: LinkRefusalReason | LinkRemovalReason | null;
  ended_at: Date | null;
}

/** An active link and the child behind it, for the guardian's own view. */
export interface ChildRow {
  link_id: string;
  relationship: GuardianRelationship;
  student_id: string;
  name: string;
  class_id: string | null;
  class_name: string | null;
}

const GUARDIAN_COLUMNS = 'g.id, g.name, g.username, g.status, g.must_change_password';

const toLink = (row: LinkRow): GuardianLink => ({
  id: row.id,
  student: { id: row.student_id, name: row.student_name, className: row.class_name },
  relationship: row.relationship,
  status: row.status,
  endReason: row.end_reason,
  endedAt: row.ended_at?.toISOString() ?? null,
});

export const toSchoolGuardian = (row: GuardianRow, links: readonly LinkRow[]): SchoolGuardian => ({
  id: row.id,
  name: row.name,
  username: row.username,
  status: row.status,
  hasOwnPassword: !row.must_change_password,
  links: links.filter((link) => link.guardian_id === row.id).map(toLink),
});

/** One page of guardians by name. */
export async function listGuardians(
  db: Queryable,
  schoolId: string,
  limit: number,
  after: { name: string; id: string } | null,
): Promise<GuardianRow[]> {
  const { rows } = await db.query<GuardianRow>(
    `SELECT ${GUARDIAN_COLUMNS} FROM guardians g
      WHERE g.school_id = $1 AND ($2::text IS NULL OR (g.name, g.id) > ($2, $3::uuid))
      ORDER BY g.name, g.id LIMIT $4`,
    [schoolId, after?.name ?? null, after?.id ?? null, limit + 1],
  );
  return rows;
}

export async function findGuardian(db: Queryable, schoolId: string, id: string): Promise<GuardianRow | null> {
  const { rows } = await db.query<GuardianRow>(`SELECT ${GUARDIAN_COLUMNS} FROM guardians g WHERE g.school_id = $1 AND g.id = $2`, [
    schoolId,
    id,
  ]);
  return rows[0] ?? null;
}

/** Every link of these guardians, active ones first, in one query (no query per guardian). */
export async function listLinks(db: Queryable, schoolId: string, guardianIds: readonly string[]): Promise<LinkRow[]> {
  if (guardianIds.length === 0) return [];
  const { rows } = await db.query<LinkRow>(
    `SELECT l.id, l.guardian_id, l.student_id, s.name AS student_name, COALESCE(c.name, '') AS class_name, l.relationship, l.status,
            l.end_reason, l.ended_at
       FROM guardian_links l
       JOIN students s ON s.id = l.student_id AND s.school_id = l.school_id
       LEFT JOIN class_enrolments e ON e.student_id = s.id AND e.school_id = s.school_id
       LEFT JOIN classes c ON c.id = e.class_id AND c.school_id = e.school_id
      WHERE l.school_id = $1 AND l.guardian_id = ANY($2::uuid[])
      ORDER BY (l.status = 'active') DESC, s.name, l.created_at, l.id`,
    [schoolId, guardianIds],
  );
  return rows;
}

export interface NewGuardianRecord {
  name: string;
  username: string;
  passwordHash: string;
  startingPasswordExpiresAt: Date;
  now: Date;
}

/** Inserts a guardian, or returns null when the username is already taken (the caller picks another). */
export async function insertGuardian(db: Queryable, schoolId: string, record: NewGuardianRecord): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO guardians (school_id, name, username, password_hash, must_change_password, starting_password_expires_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, true, $5, $6, $6)
     ON CONFLICT (username) DO NOTHING RETURNING id`,
    [schoolId, record.name, record.username, record.passwordHash, record.startingPasswordExpiresAt, record.now],
  );
  return rows[0]?.id ?? null;
}

export async function updateGuardianDetails(
  db: Queryable,
  schoolId: string,
  id: string,
  changes: { name?: string; status?: StudentStatus },
  now: Date,
): Promise<void> {
  await db.query(
    `UPDATE guardians SET name = COALESCE($3, name), status = COALESCE($4::student_status, status), updated_at = $5
      WHERE school_id = $1 AND id = $2`,
    [schoolId, id, changes.name ?? null, changes.status ?? null, now],
  );
}

/** A new starting password: the guardian must choose their own again before anything else opens. */
export async function setGuardianStartingPassword(
  db: Queryable,
  schoolId: string,
  id: string,
  passwordHash: string,
  expiresAt: Date,
  now: Date,
): Promise<void> {
  await db.query(
    `UPDATE guardians SET password_hash = $3, must_change_password = true, starting_password_expires_at = $4, updated_at = $5
      WHERE school_id = $1 AND id = $2`,
    [schoolId, id, passwordHash, expiresAt, now],
  );
}

/** Deletes the guardian; their links and sessions go with them (ON DELETE CASCADE). */
export async function deleteGuardian(db: Queryable, schoolId: string, id: string): Promise<boolean> {
  const result = await db.query('DELETE FROM guardians WHERE school_id = $1 AND id = $2', [schoolId, id]);
  return (result.rowCount ?? 0) > 0;
}

export async function revokeGuardianSessions(db: Queryable, schoolId: string, guardianId: string): Promise<void> {
  await db.query('DELETE FROM guardian_sessions WHERE school_id = $1 AND guardian_id = $2', [schoolId, guardianId]);
}

export async function countActiveLinks(db: Queryable, schoolId: string, guardianId: string): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM guardian_links WHERE school_id = $1 AND guardian_id = $2 AND status = 'active'`,
    [schoolId, guardianId],
  );
  return rows[0].count;
}

/** Adds an active link, or returns null when this guardian is already linked to this child. */
export async function insertLink(
  db: Queryable,
  schoolId: string,
  link: { guardianId: string; studentId: string; relationship: GuardianRelationship; createdBy: string; now: Date },
): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO guardian_links (school_id, guardian_id, student_id, relationship, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (guardian_id, student_id) WHERE status = 'active' DO NOTHING RETURNING id`,
    [schoolId, link.guardianId, link.studentId, link.relationship, link.createdBy, link.now],
  );
  return rows[0]?.id ?? null;
}

/** Ends one active link of this guardian. False when there is no such active link. */
export async function endLink(
  db: Queryable,
  schoolId: string,
  target: { guardianId: string; linkId: string },
  end: { status: 'refused' | 'removed'; reason: LinkRefusalReason | LinkRemovalReason; now: Date },
): Promise<boolean> {
  const result = await db.query(
    `UPDATE guardian_links SET status = $4, end_reason = $5, ended_at = $6
      WHERE school_id = $1 AND guardian_id = $2 AND id = $3 AND status = 'active'`,
    [schoolId, target.guardianId, target.linkId, end.status, end.reason, end.now],
  );
  return (result.rowCount ?? 0) > 0;
}

const CHILD_SELECT = `SELECT l.id AS link_id, l.relationship, s.id AS student_id, s.name, e.class_id, c.name AS class_name
   FROM guardian_links l
   JOIN students s ON s.id = l.student_id AND s.school_id = l.school_id
   LEFT JOIN class_enrolments e ON e.student_id = s.id AND e.school_id = s.school_id
   LEFT JOIN classes c ON c.id = e.class_id AND c.school_id = e.school_id
  WHERE l.school_id = $1 AND l.guardian_id = $2 AND l.status = 'active'`;

/** The guardian's children through their active links only. */
export async function listChildren(db: Queryable, schoolId: string, guardianId: string): Promise<ChildRow[]> {
  const { rows } = await db.query<ChildRow>(`${CHILD_SELECT} ORDER BY s.name, l.id`, [schoolId, guardianId]);
  return rows;
}

/** One child through one of the guardian's active links, or null (another guardian's link, or one that has ended). */
export async function findChild(db: Queryable, schoolId: string, guardianId: string, linkId: string): Promise<ChildRow | null> {
  const { rows } = await db.query<ChildRow>(`${CHILD_SELECT} AND l.id = $3`, [schoolId, guardianId, linkId]);
  return rows[0] ?? null;
}
