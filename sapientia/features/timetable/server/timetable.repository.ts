import 'server-only';
import type { IsoWeekday } from '@/features/delivery/interfaces/working-calendar.interface';
import type { Queryable } from '@/shared/server/database.service';
import type { NewTimetableSlot, TimetableSlot } from '../interfaces/timetable.interface';

/** Every function takes schoolId first and filters on it. */

export interface SlotRow {
  id: string;
  teacher_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  class_id: string | null;
  class_name: string | null;
  subject_id: string | null;
  subject_name: string | null;
  label: string | null;
}

/** Shared with the lesson records, which list the same periods. */
export const SLOT_COLUMNS = `s.id, s.teacher_id, s.weekday, to_char(s.start_time, 'HH24:MI') AS start_time, to_char(s.end_time, 'HH24:MI') AS end_time,
  s.class_id, c.name AS class_name, s.subject_id, j.name AS subject_name, s.label`;
export const SLOT_JOINS = `LEFT JOIN classes c ON c.id = s.class_id AND c.school_id = s.school_id
  LEFT JOIN subjects j ON j.id = s.subject_id AND j.school_id = s.school_id`;

export const toSlot = (row: SlotRow): TimetableSlot => ({
  id: row.id,
  weekday: row.weekday as IsoWeekday,
  startTime: row.start_time,
  endTime: row.end_time,
  class: row.class_id && row.class_name ? { id: row.class_id, name: row.class_name } : null,
  subject: row.subject_id && row.subject_name ? { id: row.subject_id, name: row.subject_name } : null,
  label: row.label,
});

/** One teacher's week, Monday first, earliest period first. */
export async function listSlots(db: Queryable, schoolId: string, teacherId: string, limit: number): Promise<TimetableSlot[]> {
  const { rows } = await db.query<SlotRow>(
    `SELECT ${SLOT_COLUMNS} FROM timetable_slots s ${SLOT_JOINS}
      WHERE s.school_id = $1 AND s.teacher_id = $2
      ORDER BY s.weekday, s.start_time LIMIT $3`,
    [schoolId, teacherId, limit],
  );
  return rows.map(toSlot);
}

/** The weekly periods of several teachers in one query, for the capacity check. */
export async function listSlotTimes(db: Queryable, schoolId: string, teacherIds: readonly string[]) {
  const { rows } = await db.query<{ teacher_id: string; weekday: number; start_time: string; end_time: string }>(
    `SELECT teacher_id, weekday, to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time
       FROM timetable_slots WHERE school_id = $1 AND teacher_id = ANY($2::uuid[])`,
    [schoolId, teacherIds],
  );
  return rows;
}

/**
 * Holds one teacher's timetable until the transaction ends, so two periods added at once are counted one after the other
 * and cannot both slip under the cap. NO KEY UPDATE leaves the row free for the foreign-key checks of everything else that
 * points at the teacher.
 */
export async function lockTeacherTimetable(db: Queryable, schoolId: string, teacherId: string): Promise<void> {
  await db.query('SELECT 1 FROM users WHERE school_id = $1 AND id = $2 FOR NO KEY UPDATE', [schoolId, teacherId]);
}

/**
 * True if a weekly period at this time would clash with relief the teacher already covers and that is not yet over: on a
 * later date with that weekday, or today ending after the given school-local time. The relief overlap constraint cannot
 * see the timetable, so this is checked here.
 */
export async function hasReliefDutyClash(
  db: Queryable,
  schoolId: string,
  slot: Pick<NewTimetableSlot, 'teacherId' | 'weekday' | 'startTime' | 'endTime'>,
  today: string,
  time: string,
): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM relief_assignments
      WHERE school_id = $1 AND relief_teacher_id = $2 AND extract(isodow FROM on_date) = $3
        AND start_time < $5::time AND end_time > $4::time
        AND (on_date > $6::date OR (on_date = $6::date AND end_time > $7::time))
      LIMIT 1`,
    [schoolId, slot.teacherId, slot.weekday, slot.startTime, slot.endTime, today, time],
  );
  return rows.length > 0;
}

export async function countSlots(db: Queryable, schoolId: string, teacherId: string): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    'SELECT count(*)::int AS total FROM timetable_slots WHERE school_id = $1 AND teacher_id = $2',
    [schoolId, teacherId],
  );
  return rows[0].total;
}

/**
 * Inserts a period and returns it with its class and subject names. The class and subject must belong to the same school:
 * the composite foreign keys refuse anything else, and so does the overlap constraint for a clashing time.
 */
export async function insertSlot(db: Queryable, schoolId: string, slot: NewTimetableSlot, now: Date): Promise<TimetableSlot> {
  const { rows } = await db.query<SlotRow>(
    `WITH s AS (
       INSERT INTO timetable_slots (school_id, teacher_id, weekday, start_time, end_time, class_id, subject_id, label, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
     )
     SELECT ${SLOT_COLUMNS} FROM s ${SLOT_JOINS}`,
    [
      schoolId, slot.teacherId, slot.weekday, slot.startTime, slot.endTime,
      slot.classId ?? null, slot.subjectId ?? null, slot.label ?? null, now,
    ],
  );
  return toSlot(rows[0]);
}

/**
 * Locks one period until the transaction ends; true if it is in this school. Relief being arranged for it at the same
 * moment holds a key-share lock on it, so this waits for that relief to commit, and a later one waits for this.
 */
export async function lockSlot(db: Queryable, schoolId: string, slotId: string): Promise<boolean> {
  const { rows } = await db.query('SELECT 1 FROM timetable_slots WHERE school_id = $1 AND id = $2 FOR UPDATE', [schoolId, slotId]);
  return rows.length > 0;
}

/** True if the period has relief not yet over: on a later date, or on today's date ending after the given school-local time. */
export async function hasReliefToCome(db: Queryable, schoolId: string, slotId: string, today: string, time: string): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM relief_assignments
      WHERE school_id = $1 AND slot_id = $2 AND (on_date > $3::date OR (on_date = $3::date AND end_time > $4::time))
      LIMIT 1`,
    [schoolId, slotId, today, time],
  );
  return rows.length > 0;
}

/**
 * Removes the period; returns whose it was, or null if there is no such period in this school. Its lesson records and
 * relief already over stay, with slot_id cleared.
 */
export async function deleteSlot(db: Queryable, schoolId: string, slotId: string): Promise<string | null> {
  const { rows } = await db.query<{ teacher_id: string }>(
    'DELETE FROM timetable_slots WHERE school_id = $1 AND id = $2 RETURNING teacher_id',
    [schoolId, slotId],
  );
  return rows[0]?.teacher_id ?? null;
}

/** A class's lessons across the week, for its pupils: times and subject only, never who teaches or other duties. */
export async function listClassLessons(db: Queryable, schoolId: string, classId: string) {
  const { rows } = await db.query<{ id: string; weekday: number; start_time: string; end_time: string; subject_name: string }>(
    `SELECT s.id, s.weekday, to_char(s.start_time, 'HH24:MI') AS start_time, to_char(s.end_time, 'HH24:MI') AS end_time,
            j.name AS subject_name
       FROM timetable_slots s JOIN subjects j ON j.id = s.subject_id AND j.school_id = s.school_id
      WHERE s.school_id = $1 AND s.class_id = $2
      ORDER BY s.weekday, s.start_time`,
    [schoolId, classId],
  );
  return rows;
}

/**
 * Which of these periods a relief teacher covers between two dates (inclusive). Only relief already delivered counts, so a
 * class learns of a teacher's absence no earlier than the relief teacher does.
 */
export async function listCoveredPeriods(
  db: Queryable,
  schoolId: string,
  slotIds: readonly string[],
  range: { fromDate: string; toDate: string },
  now: Date,
) {
  const { rows } = await db.query<{ slot_id: string; on_date: string }>(
    `SELECT slot_id, on_date::text AS on_date FROM relief_assignments
      WHERE school_id = $1 AND slot_id = ANY($2::uuid[]) AND on_date BETWEEN $3::date AND $4::date AND deliver_at <= $5`,
    [schoolId, slotIds, range.fromDate, range.toDate, now],
  );
  return rows;
}
