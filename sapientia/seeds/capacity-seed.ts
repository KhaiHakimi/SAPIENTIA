import type { Queryable } from '@/shared/server/database.service';

/**
 * Fictional subjects, classes, task types and a simple weekly timetable for the demo school (plan Phase 2), so the
 * deadline check has something to work with. Safe to run again: existing names and clashing periods are left alone.
 */

const SUBJECTS = ['Bahasa Melayu', 'Bahasa Inggeris', 'Matematik', 'Sains', 'Sejarah'];
const CLASSES = ['1 Amanah', '2 Bestari', '3 Cekal', '4 Dedikasi'];
const TASK_TYPES: readonly [name: string, minutes: number][] = [
  ['Kunci masuk markah peperiksaan', 90],
  ['Analisis item peperiksaan', 180],
  ['Laporan aktiviti kokurikulum', 60],
  ['Kemas kini rekod kehadiran', 30],
];

/** Each teacher's subject and the three lessons they teach every weekday. */
const TEACHING: readonly { email: string; subject: string }[] = [
  { email: 'cikgu.aminah@guru.sapientia.test', subject: 'Matematik' },
  { email: 'cikgu.ravi@guru.sapientia.test', subject: 'Sains' },
  { email: 'cikgu.meiling@guru.sapientia.test', subject: 'Bahasa Inggeris' },
];
const LESSON_TIMES: readonly [start: string, end: string][] = [['08:00', '09:10'], ['09:10', '10:20'], ['11:00', '12:10']];
const SCHOOL_DAYS = [1, 2, 3, 4, 5];
const ASSEMBLY = { weekday: 1, start: '07:30', end: '08:00', label: 'Perhimpunan' };

async function idsByName(db: Queryable, table: 'subjects' | 'classes', schoolId: string): Promise<Map<string, string>> {
  const { rows } = await db.query<{ id: string; name: string }>(`SELECT id, name FROM ${table} WHERE school_id = $1`, [schoolId]);
  return new Map(rows.map((row) => [row.name, row.id]));
}

export async function seedCapacity(db: Queryable, schoolId: string): Promise<void> {
  await db.query(
    `INSERT INTO subjects (school_id, name) SELECT $1, name FROM unnest($2::text[]) AS name
     ON CONFLICT (school_id, lower(name)) DO NOTHING`,
    [schoolId, SUBJECTS],
  );
  await db.query(
    `INSERT INTO classes (school_id, name) SELECT $1, name FROM unnest($2::text[]) AS name
     ON CONFLICT (school_id, lower(name)) DO NOTHING`,
    [schoolId, CLASSES],
  );
  await db.query(
    `INSERT INTO task_types (school_id, name, estimated_minutes)
     SELECT $1, name, minutes FROM unnest($2::text[], $3::int[]) AS t (name, minutes)
     ON CONFLICT (school_id, lower(name)) WHERE archived_at IS NULL DO NOTHING`,
    [schoolId, TASK_TYPES.map(([name]) => name), TASK_TYPES.map(([, minutes]) => minutes)],
  );

  const subjects = await idsByName(db, 'subjects', schoolId);
  const classes = await idsByName(db, 'classes', schoolId);
  for (const [teacherIndex, { email, subject }] of TEACHING.entries()) {
    const { rows } = await db.query<{ id: string }>('SELECT id FROM users WHERE school_id = $1 AND lower(email) = $2', [schoolId, email]);
    const teacherId = rows[0]?.id;
    if (!teacherId) continue;
    // A period that would overlap one already there (a second run, or one edited by hand) is skipped.
    await db.query(
      `INSERT INTO timetable_slots (school_id, teacher_id, weekday, start_time, end_time, label) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [schoolId, teacherId, ASSEMBLY.weekday, ASSEMBLY.start, ASSEMBLY.end, ASSEMBLY.label],
    );
    for (const weekday of SCHOOL_DAYS) {
      for (const [lessonIndex, [start, end]] of LESSON_TIMES.entries()) {
        // Rotate the classes so the three teachers are never timetabled with the same class at once.
        const className = CLASSES[(teacherIndex + lessonIndex + weekday) % CLASSES.length];
        await db.query(
          `INSERT INTO timetable_slots (school_id, teacher_id, weekday, start_time, end_time, class_id, subject_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
          [schoolId, teacherId, weekday, start, end, classes.get(className), subjects.get(subject)],
        );
      }
    }
  }
}
