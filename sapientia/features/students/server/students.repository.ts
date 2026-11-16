import 'server-only';
import type { Queryable } from '@/shared/server/database.service';
import type { SchoolStudent, StudentStatus } from '../interfaces/student.interface';

/** Every function takes schoolId first and filters on it, so no query here can reach another school's pupils. */

interface StudentRow {
  id: string;
  name: string;
  school_number: string | null;
  class_id: string;
  class_name: string;
  username: string;
  status: StudentStatus;
  must_change_password: boolean;
}

const STUDENT_COLUMNS = `s.id, s.name, s.school_number, e.class_id, c.name AS class_name, s.username, s.status, s.must_change_password`;
const STUDENT_FROM = `students s
  JOIN class_enrolments e ON e.student_id = s.id AND e.school_id = s.school_id
  JOIN classes c ON c.id = e.class_id AND c.school_id = e.school_id`;

export const toSchoolStudent = (row: StudentRow): SchoolStudent => ({
  id: row.id,
  name: row.name,
  schoolNumber: row.school_number,
  classId: row.class_id,
  className: row.class_name,
  username: row.username,
  status: row.status,
  hasOwnPassword: !row.must_change_password,
});

/** One page by name, optionally of one class. */
export async function listStudents(
  db: Queryable,
  schoolId: string,
  classId: string | null,
  limit: number,
  after: { name: string; id: string } | null,
): Promise<StudentRow[]> {
  const { rows } = await db.query<StudentRow>(
    `SELECT ${STUDENT_COLUMNS} FROM ${STUDENT_FROM}
      WHERE s.school_id = $1 AND ($2::uuid IS NULL OR e.class_id = $2)
        AND ($3::text IS NULL OR (s.name, s.id) > ($3, $4::uuid))
      ORDER BY s.name, s.id LIMIT $5`,
    [schoolId, classId, after?.name ?? null, after?.id ?? null, limit + 1],
  );
  return rows;
}

export async function findStudent(db: Queryable, schoolId: string, id: string): Promise<StudentRow | null> {
  const { rows } = await db.query<StudentRow>(`SELECT ${STUDENT_COLUMNS} FROM ${STUDENT_FROM} WHERE s.school_id = $1 AND s.id = $2`, [
    schoolId,
    id,
  ]);
  return rows[0] ?? null;
}

export async function findClassName(db: Queryable, schoolId: string, classId: string): Promise<string | null> {
  const { rows } = await db.query<{ name: string }>('SELECT name FROM classes WHERE school_id = $1 AND id = $2', [schoolId, classId]);
  return rows[0]?.name ?? null;
}

/** School numbers (lower case) from the list that another pupil of this school already has, apart from `exceptId`. */
export async function takenSchoolNumbers(
  db: Queryable,
  schoolId: string,
  numbers: readonly string[],
  exceptId: string | null = null,
): Promise<Set<string>> {
  if (numbers.length === 0) return new Set();
  const { rows } = await db.query<{ number: string }>(
    `SELECT lower(school_number) AS number FROM students
      WHERE school_id = $1 AND lower(school_number) = ANY($2::text[]) AND ($3::uuid IS NULL OR id <> $3)`,
    [schoolId, numbers.map((number) => number.toLowerCase()), exceptId],
  );
  return new Set(rows.map((row) => row.number));
}

export interface NewStudentRecord {
  name: string;
  schoolNumber: string | null;
  username: string;
  passwordHash: string;
  startingPasswordExpiresAt: Date;
  now: Date;
}

/** Inserts a pupil, or returns null when the username is already taken (the caller picks another). */
export async function insertStudent(db: Queryable, schoolId: string, record: NewStudentRecord): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO students (school_id, name, school_number, username, password_hash, must_change_password,
                           starting_password_expires_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, $6, $7, $7)
     ON CONFLICT (username) DO NOTHING RETURNING id`,
    [schoolId, record.name, record.schoolNumber, record.username, record.passwordHash, record.startingPasswordExpiresAt, record.now],
  );
  return rows[0]?.id ?? null;
}

/** Puts a pupil in a class, replacing the class they were in. */
export async function enrolStudent(db: Queryable, schoolId: string, studentId: string, classId: string, now: Date): Promise<void> {
  await db.query(
    `INSERT INTO class_enrolments (school_id, student_id, class_id, enrolled_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT (student_id) DO UPDATE SET class_id = EXCLUDED.class_id, enrolled_at = EXCLUDED.enrolled_at`,
    [schoolId, studentId, classId, now],
  );
}

export async function updateStudentDetails(
  db: Queryable,
  schoolId: string,
  id: string,
  changes: { name?: string; schoolNumber?: string | null; status?: StudentStatus },
  now: Date,
): Promise<void> {
  await db.query(
    `UPDATE students SET
       name = COALESCE($3, name),
       school_number = CASE WHEN $4 THEN $5 ELSE school_number END,
       status = COALESCE($6::student_status, status),
       updated_at = $7
     WHERE school_id = $1 AND id = $2`,
    [schoolId, id, changes.name ?? null, changes.schoolNumber !== undefined, changes.schoolNumber ?? null, changes.status ?? null, now],
  );
}

/** A new starting password: the pupil must choose their own again before anything else opens. */
export async function setStartingPassword(
  db: Queryable,
  schoolId: string,
  id: string,
  passwordHash: string,
  expiresAt: Date,
  now: Date,
): Promise<void> {
  await db.query(
    `UPDATE students SET password_hash = $3, must_change_password = true, starting_password_expires_at = $4, updated_at = $5
      WHERE school_id = $1 AND id = $2`,
    [schoolId, id, passwordHash, expiresAt, now],
  );
}

/** Deletes the pupil; their class place and sessions go with them (ON DELETE CASCADE). */
export async function deleteStudent(db: Queryable, schoolId: string, id: string): Promise<boolean> {
  const result = await db.query('DELETE FROM students WHERE school_id = $1 AND id = $2', [schoolId, id]);
  return (result.rowCount ?? 0) > 0;
}

export async function revokeStudentSessions(db: Queryable, schoolId: string, studentId: string): Promise<void> {
  await db.query('DELETE FROM student_sessions WHERE school_id = $1 AND student_id = $2', [schoolId, studentId]);
}
