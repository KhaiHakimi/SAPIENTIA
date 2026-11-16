import { DEMO_PUPILS } from '@/features/auth/data/demo-pupils';
import type { Queryable } from '@/shared/server/database.service';

/**
 * The fictional pupils listed on the sign-in page (plan Phase 4), in the demo school's classes (seeded by capacity-seed).
 * They use the seed password and have already chosen it, so they skip the slip step. Safe to run again: the same usernames
 * are updated.
 */
export async function seedStudents(db: Queryable, schoolId: string, passwordHash: string): Promise<void> {
  for (const pupil of DEMO_PUPILS) {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO students (school_id, name, username, password_hash, must_change_password, starting_password_expires_at)
       VALUES ($1, $2, $3, $4, false, NULL)
       ON CONFLICT (username) DO UPDATE
         SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, must_change_password = false,
             starting_password_expires_at = NULL, status = 'active', updated_at = now()
       RETURNING id`,
      [schoolId, pupil.name, pupil.username, passwordHash],
    );
    await db.query(
      `INSERT INTO class_enrolments (school_id, student_id, class_id)
       SELECT $1, $2, id FROM classes WHERE school_id = $1 AND name = $3
       ON CONFLICT (student_id) DO UPDATE SET class_id = EXCLUDED.class_id`,
      [schoolId, rows[0].id, pupil.className],
    );
  }
}
