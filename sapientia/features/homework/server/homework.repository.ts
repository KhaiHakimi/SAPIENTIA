import 'server-only';
import type { Queryable } from '@/shared/server/database.service';
import type {
  ClassHomework, HandInPupil, Homework, HomeworkComment, HomeworkLesson, PupilComment, PupilHomework,
} from '../interfaces/homework.interface';

/** Every function takes schoolId first and filters on it. Dates are read as text so no time zone can shift the day. */

interface HomeworkRow {
  id: string;
  set_by: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  title: string;
  details: string | null;
  due_on: string;
  marking_minutes: number | null;
  mark_by: string | null;
  marked_at: Date | null;
  load_flagged: boolean;
  handed_in_count: number;
  pupil_count: number;
}

// The counts are of the class's current pupils, so a pupil who has moved class drops out of both.
const HOMEWORK_SELECT = `
  SELECT h.id, h.set_by, h.class_id, c.name AS class_name, h.subject_id, j.name AS subject_name, h.title, h.details,
         h.due_on::text AS due_on, h.marking_minutes, h.mark_by::text AS mark_by, h.marked_at, h.load_flagged,
         (SELECT count(*)::int FROM homework_status hs
            JOIN class_enrolments e ON e.student_id = hs.student_id AND e.class_id = h.class_id
           WHERE hs.homework_id = h.id) AS handed_in_count,
         (SELECT count(*)::int FROM class_enrolments e WHERE e.class_id = h.class_id AND e.school_id = h.school_id) AS pupil_count
    FROM homework h
    JOIN classes c ON c.id = h.class_id AND c.school_id = h.school_id
    JOIN subjects j ON j.id = h.subject_id AND j.school_id = h.school_id`;

const toHomework = (row: HomeworkRow): Homework => ({
  id: row.id,
  class: { id: row.class_id, name: row.class_name },
  subject: { id: row.subject_id, name: row.subject_name },
  title: row.title,
  details: row.details,
  dueOn: row.due_on,
  markingMinutes: row.marking_minutes,
  markBy: row.mark_by,
  marked: row.marked_at !== null,
  loadFlagged: row.load_flagged,
  handedInCount: row.handed_in_count,
  pupilCount: row.pupil_count,
});

/** The class and subject pairs on a teacher's own weekly timetable, by class then subject. */
export async function listTeacherLessons(db: Queryable, schoolId: string, teacherId: string): Promise<HomeworkLesson[]> {
  const { rows } = await db.query<{ class_id: string; class_name: string; subject_id: string; subject_name: string }>(
    `SELECT DISTINCT s.class_id, c.name AS class_name, s.subject_id, j.name AS subject_name
       FROM timetable_slots s
       JOIN classes c ON c.id = s.class_id AND c.school_id = s.school_id
       JOIN subjects j ON j.id = s.subject_id AND j.school_id = s.school_id
      WHERE s.school_id = $1 AND s.teacher_id = $2
      ORDER BY c.name, j.name`,
    [schoolId, teacherId],
  );
  return rows.map((row) => ({
    classId: row.class_id, className: row.class_name, subjectId: row.subject_id, subjectName: row.subject_name,
  }));
}

/** Whether the teacher teaches this subject to this class on their weekly timetable. */
export async function teachesLesson(db: Queryable, schoolId: string, teacherId: string, lesson: { classId: string; subjectId: string }) {
  const { rows } = await db.query(
    'SELECT 1 FROM timetable_slots WHERE school_id = $1 AND teacher_id = $2 AND class_id = $3 AND subject_id = $4 LIMIT 1',
    [schoolId, teacherId, lesson.classId, lesson.subjectId],
  );
  return rows.length > 0;
}


/**
 * Holds the class's row until the transaction ends, so the homework due on a day is counted and added one teacher at a time:
 * two teachers setting work for the same class at once cannot both miss the same-day warning. FOR NO KEY UPDATE, because
 * other work for the class (enrolments, timetable slots, homework) only refers to the row and need not wait.
 */
export async function lockClass(db: Queryable, schoolId: string, classId: string): Promise<void> {
  await db.query('SELECT 1 FROM classes WHERE school_id = $1 AND id = $2 FOR NO KEY UPDATE', [schoolId, classId]);
}
/** The class's homework due between two dates (inclusive): date and subject only, never who set it. */
export async function listClassHomeworkDays(db: Queryable, schoolId: string, classId: string, fromDate: string, toDate: string) {
  const { rows } = await db.query<{ due_on: string; subject_name: string }>(
    `SELECT h.due_on::text AS due_on, j.name AS subject_name
       FROM homework h JOIN subjects j ON j.id = h.subject_id AND j.school_id = h.school_id
      WHERE h.school_id = $1 AND h.class_id = $2 AND h.due_on BETWEEN $3::date AND $4::date
      ORDER BY h.due_on, j.name`,
    [schoolId, classId, fromDate, toDate],
  );
  return rows.map((row) => ({ dueOn: row.due_on, subjectName: row.subject_name }));
}

export interface NewHomeworkRow {
  classId: string;
  subjectId: string;
  setBy: string;
  title: string;
  details: string | null;
  dueOn: string;
  markingMinutes: number | null;
  markBy: string | null;
  loadFlagged: boolean;
  now: Date;
}

export async function insertHomework(db: Queryable, schoolId: string, input: NewHomeworkRow): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO homework (school_id, class_id, subject_id, set_by, title, details, due_on, marking_minutes, mark_by, load_flagged, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [
      schoolId, input.classId, input.subjectId, input.setBy, input.title, input.details, input.dueOn,
      input.markingMinutes, input.markBy, input.loadFlagged, input.now,
    ],
  );
  return rows[0].id;
}

/** One piece of homework, only when this teacher set it: anyone else's is treated as not existing. */
export async function findOwnHomework(db: Queryable, schoolId: string, setterId: string, homeworkId: string): Promise<Homework | null> {
  const { rows } = await db.query<HomeworkRow>(`${HOMEWORK_SELECT} WHERE h.school_id = $1 AND h.set_by = $2 AND h.id = $3`, [
    schoolId, setterId, homeworkId,
  ]);
  return rows[0] ? toHomework(rows[0]) : null;
}

/** A teacher's own homework due on or after a day, earliest first. */
export async function listOwnHomework(db: Queryable, schoolId: string, setterId: string, fromDate: string, limit: number) {
  const { rows } = await db.query<HomeworkRow>(
    `${HOMEWORK_SELECT} WHERE h.school_id = $1 AND h.set_by = $2 AND h.due_on >= $3::date ORDER BY h.due_on, h.created_at, h.id LIMIT $4`,
    [schoolId, setterId, fromDate, limit],
  );
  return rows.map(toHomework);
}

/** Records or clears that the marking is done; returns false when the homework has no marking estimate. */
export async function setMarked(db: Queryable, schoolId: string, homeworkId: string, markedAt: Date | null): Promise<boolean> {
  const { rowCount } = await db.query(
    'UPDATE homework SET marked_at = $3 WHERE school_id = $1 AND id = $2 AND marking_minutes IS NOT NULL',
    [schoolId, homeworkId, markedAt],
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteHomework(db: Queryable, schoolId: string, homeworkId: string): Promise<void> {
  await db.query('DELETE FROM homework WHERE school_id = $1 AND id = $2', [schoolId, homeworkId]);
}

/** The class's current pupils by name, each with whether their hand-in is recorded for this homework. */
export async function listHandIns(db: Queryable, schoolId: string, homeworkId: string, classId: string): Promise<HandInPupil[]> {
  const { rows } = await db.query<{ id: string; name: string; handed_in: boolean }>(
    `SELECT s.id, s.name, (hs.student_id IS NOT NULL) AS handed_in
       FROM class_enrolments e
       JOIN students s ON s.id = e.student_id AND s.school_id = e.school_id
       LEFT JOIN homework_status hs ON hs.homework_id = $2 AND hs.student_id = s.id
      WHERE e.school_id = $1 AND e.class_id = $3
      ORDER BY s.name, s.id`,
    [schoolId, homeworkId, classId],
  );
  return rows.map((row) => ({ id: row.id, name: row.name, handedIn: row.handed_in }));
}

export async function isEnrolled(db: Queryable, schoolId: string, studentId: string, classId: string): Promise<boolean> {
  const { rows } = await db.query('SELECT 1 FROM class_enrolments WHERE school_id = $1 AND student_id = $2 AND class_id = $3', [
    schoolId, studentId, classId,
  ]);
  return rows.length > 0;
}

/** Records a hand-in; a second tap for the same pupil keeps the first time. */
export async function recordHandIn(
  db: Queryable,
  schoolId: string,
  input: { homeworkId: string; studentId: string; by: string; at: Date },
) {
  await db.query(
    `INSERT INTO homework_status (homework_id, student_id, school_id, handed_in_at, recorded_by) VALUES ($2, $3, $1, $4, $5)
     ON CONFLICT (homework_id, student_id) DO NOTHING`,
    [schoolId, input.homeworkId, input.studentId, input.at, input.by],
  );
}

export async function clearHandIn(db: Queryable, schoolId: string, homeworkId: string, studentId: string): Promise<void> {
  await db.query('DELETE FROM homework_status WHERE school_id = $1 AND homework_id = $2 AND student_id = $3', [
    schoolId, homeworkId, studentId,
  ]);
}

/**
 * For homework due in a date range: the class's current pupils, the pieces of homework, and the hand-ins recorded by those
 * pupils (a pupil who has moved class drops out of both counts). Counts only, never who.
 */
export async function countClassHandIns(
  db: Queryable,
  schoolId: string,
  classId: string,
  range: { fromDate: string; toDate: string },
): Promise<{ pupils: number; pieces: number; handedIn: number }> {
  const { rows } = await db.query<{ pupils: number; pieces: number; handed_in: number }>(
    `SELECT (SELECT count(*)::int FROM class_enrolments e WHERE e.school_id = $1 AND e.class_id = $2) AS pupils,
            (SELECT count(*)::int FROM homework h
              WHERE h.school_id = $1 AND h.class_id = $2 AND h.due_on BETWEEN $3::date AND $4::date) AS pieces,
            (SELECT count(*)::int FROM homework h
               JOIN homework_status hs ON hs.homework_id = h.id AND hs.school_id = h.school_id
               JOIN class_enrolments e ON e.student_id = hs.student_id AND e.school_id = h.school_id AND e.class_id = h.class_id
              WHERE h.school_id = $1 AND h.class_id = $2 AND h.due_on BETWEEN $3::date AND $4::date) AS handed_in`,
    [schoolId, classId, range.fromDate, range.toDate],
  );
  const [row] = rows;
  return { pupils: row.pupils, pieces: row.pieces, handedIn: row.handed_in };
}

/** A class's homework due on or after a day, with whether this one pupil's hand-in is recorded. Nothing about anyone else. */
export async function listPupilHomework(
  db: Queryable,
  schoolId: string,
  pupil: { studentId: string; classId: string },
  fromDate: string,
  limit: number,
): Promise<PupilHomework[]> {
  const { rows } = await db.query<{
    id: string; subject_name: string; teacher_name: string; title: string; details: string | null; due_on: string; handed_in: boolean;
  }>(
    `SELECT h.id, j.name AS subject_name, u.name AS teacher_name, h.title, h.details, h.due_on::text AS due_on,
            (hs.student_id IS NOT NULL) AS handed_in
       FROM homework h
       JOIN subjects j ON j.id = h.subject_id AND j.school_id = h.school_id
       JOIN users u ON u.id = h.set_by AND u.school_id = h.school_id
       LEFT JOIN homework_status hs ON hs.homework_id = h.id AND hs.student_id = $2
      WHERE h.school_id = $1 AND h.class_id = $3 AND h.due_on >= $4::date
      ORDER BY h.due_on, j.name, h.id
      LIMIT $5`,
    [schoolId, pupil.studentId, pupil.classId, fromDate, limit],
  );
  const comments = await listPupilComments(db, schoolId, pupil.studentId, rows.map((row) => row.id));
  return rows.map((row) => ({
    id: row.id, subjectName: row.subject_name, teacherName: row.teacher_name, title: row.title, details: row.details,
    dueOn: row.due_on, handedIn: row.handed_in, comments: comments.get(row.id) ?? [],
  }));
}

/**
 * A class's homework due between two dates, with no hand-ins: for the guardian summary an administrator prints. Hand-ins stay
 * with the teacher who set the work (Sprint 12), so the printed sheet does not show them.
 */
export async function listClassHomework(
  db: Queryable,
  schoolId: string,
  classId: string,
  dates: { fromDate: string; toDate: string },
  limit: number,
): Promise<ClassHomework[]> {
  const { rows } = await db.query<{
    id: string; subject_name: string; teacher_name: string; title: string; details: string | null; due_on: string;
  }>(
    `SELECT h.id, j.name AS subject_name, u.name AS teacher_name, h.title, h.details, h.due_on::text AS due_on
       FROM homework h
       JOIN subjects j ON j.id = h.subject_id AND j.school_id = h.school_id
       JOIN users u ON u.id = h.set_by AND u.school_id = h.school_id
      WHERE h.school_id = $1 AND h.class_id = $2 AND h.due_on BETWEEN $3::date AND $4::date
      ORDER BY h.due_on, j.name, h.id
      LIMIT $5`,
    [schoolId, classId, dates.fromDate, dates.toDate, limit],
  );
  return rows.map((row) => ({
    id: row.id, subjectName: row.subject_name, teacherName: row.teacher_name, title: row.title, details: row.details, dueOn: row.due_on,
  }));
}

/** This pupil's visible comments on these pieces of homework, in one query, oldest first under each piece. */
async function listPupilComments(db: Queryable, schoolId: string, studentId: string, homeworkIds: string[]) {
  const byHomework = new Map<string, PupilComment[]>();
  if (homeworkIds.length === 0) return byHomework;
  const { rows } = await db.query<{ id: string; homework_id: string; body: string; created_at: Date }>(
    `SELECT id, homework_id, body, created_at FROM homework_comments
      WHERE school_id = $1 AND student_id = $2 AND homework_id = ANY($3::uuid[]) AND hidden_at IS NULL
      ORDER BY created_at, id`,
    [schoolId, studentId, homeworkIds],
  );
  for (const row of rows) {
    const list = byHomework.get(row.homework_id) ?? [];
    list.push({ id: row.id, body: row.body, createdAt: row.created_at.toISOString() });
    byHomework.set(row.homework_id, list);
  }
  return byHomework;
}

/**
 * Every comment on one piece of homework, hidden ones included: for the teacher who set it. No row limit: the teacher must be
 * able to find, and hide, any of them, and HOMEWORK_COMMENTS_PER_PUPIL_MAX per pupil already bounds the list (a class of 40
 * is at most 400 short notes). A fixed limit used to leave the newest ones out of reach once a class passed it.
 */
export async function listHomeworkComments(db: Queryable, schoolId: string, homeworkId: string): Promise<HomeworkComment[]> {
  const { rows } = await db.query<{ id: string; student_id: string; body: string; created_at: Date; hidden_at: Date | null }>(
    `SELECT id, student_id, body, created_at, hidden_at FROM homework_comments
      WHERE school_id = $1 AND homework_id = $2
      ORDER BY created_at, id`,
    [schoolId, homeworkId],
  );
  return rows.map((row) => ({
    id: row.id, studentId: row.student_id, body: row.body, createdAt: row.created_at.toISOString(), hidden: row.hidden_at !== null,
  }));
}


/**
 * Holds the homework's row until the transaction ends, so a pupil's notes are counted and added one at a time and two quick
 * submissions cannot pass HOMEWORK_COMMENTS_PER_PUPIL_MAX together. FOR NO KEY UPDATE, so hand-ins, which only refer to the
 * row, need not wait.
 */
export async function lockHomework(db: Queryable, schoolId: string, homeworkId: string): Promise<void> {
  await db.query('SELECT 1 FROM homework WHERE school_id = $1 AND id = $2 FOR NO KEY UPDATE', [schoolId, homeworkId]);
}
export async function countPupilComments(db: Queryable, schoolId: string, homeworkId: string, studentId: string): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    'SELECT count(*)::int AS total FROM homework_comments WHERE school_id = $1 AND homework_id = $2 AND student_id = $3',
    [schoolId, homeworkId, studentId],
  );
  return rows[0].total;
}

export async function insertComment(
  db: Queryable,
  schoolId: string,
  input: { homeworkId: string; studentId: string; authorId: string; body: string; now: Date },
): Promise<HomeworkComment> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO homework_comments (school_id, homework_id, student_id, author_id, body, created_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [schoolId, input.homeworkId, input.studentId, input.authorId, input.body, input.now],
  );
  return { id: rows[0].id, studentId: input.studentId, body: input.body, createdAt: input.now.toISOString(), hidden: false };
}

/** Hides a comment still shown. Returns the pupil's id, or null when there is no such shown comment on this homework. */
export async function hideComment(db: Queryable, schoolId: string, homeworkId: string, commentId: string, now: Date) {
  const { rows } = await db.query<{ student_id: string }>(
    `UPDATE homework_comments SET hidden_at = $4
      WHERE school_id = $1 AND homework_id = $2 AND id = $3 AND hidden_at IS NULL
      RETURNING student_id`,
    [schoolId, homeworkId, commentId, now],
  );
  return rows[0]?.student_id ?? null;
}
