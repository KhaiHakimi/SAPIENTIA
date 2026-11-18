import { DEMO_GUARDIANS } from '@/features/auth/data/demo-pupils';
import type { Queryable } from '@/shared/server/database.service';

/**
 * The fictional guardian listed on the sign-in page (plan Phase 4, Sprint 13), linked to a demo pupil by the school's
 * administrator. Same seed password, already chosen. Runs after seedStudents. Safe to run again: the same username is
 * updated and an existing active link is kept.
 */
export async function seedGuardians(db: Queryable, schoolId: string, passwordHash: string): Promise<void> {
  const { rows: admins } = await db.query<{ id: string }>(
    "SELECT id FROM users WHERE school_id = $1 AND role = 'admin' ORDER BY created_at LIMIT 1",
    [schoolId],
  );
  if (!admins[0]) throw new Error('The demo school needs an administrator to make guardian links.');
  for (const guardian of DEMO_GUARDIANS) {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO guardians (school_id, name, username, password_hash, must_change_password, starting_password_expires_at)
       VALUES ($1, $2, $3, $4, false, NULL)
       ON CONFLICT (username) DO UPDATE
         SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, must_change_password = false,
             starting_password_expires_at = NULL, status = 'active', updated_at = now()
       RETURNING id`,
      [schoolId, guardian.name, guardian.username, passwordHash],
    );
    await db.query(
      `INSERT INTO guardian_links (school_id, guardian_id, student_id, relationship, created_by)
       SELECT $1, $2, s.id, $4, $5 FROM students s WHERE s.school_id = $1 AND s.username = $3
       ON CONFLICT (guardian_id, student_id) WHERE status = 'active' DO NOTHING`,
      [schoolId, rows[0].id, guardian.childUsername, guardian.relationship, admins[0].id],
    );
  }
}
