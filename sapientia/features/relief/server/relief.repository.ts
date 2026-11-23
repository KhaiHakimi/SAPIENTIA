import 'server-only';
import type { Queryable } from '@/shared/server/database.service';
import type { ReliefDuty } from '../interfaces/relief.interface';

/** Every function takes schoolId first and filters on it. Dates are read as text so no time zone can shift the day. */

export interface SlotForRelief {
  id: string;
  teacher_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export async function findSlotForRelief(db: Queryable, schoolId: string, slotId: string): Promise<SlotForRelief | null> {
  const { rows } = await db.query<SlotForRelief>(
    `SELECT id, teacher_id, weekday, to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time
       FROM timetable_slots WHERE school_id = $1 AND id = $2`,
    [schoolId, slotId],
  );
  return rows[0] ?? null;
}

/**
 * Everything that keeps anyone busy on one date: their own timetable for that weekday, and relief they already cover that
 * day. Only who and when leave this function.
 */
export async function listBusyPeriods(db: Queryable, schoolId: string, weekday: number, onDate: string) {
  const { rows } = await db.query<{ teacher_id: string; start_time: string; end_time: string }>(
    `SELECT teacher_id, to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time
       FROM timetable_slots WHERE school_id = $1 AND weekday = $2
     UNION ALL
     SELECT relief_teacher_id, to_char(start_time, 'HH24:MI'), to_char(end_time, 'HH24:MI')
       FROM relief_assignments WHERE school_id = $1 AND on_date = $3::date`,
    [schoolId, weekday, onDate],
  );
  return rows;
}

/** People with at least one timetable period: the staff who teach, and so the ones relief is suggested from. */
export async function listTeachingStaffIds(db: Queryable, schoolId: string): Promise<string[]> {
  const { rows } = await db.query<{ teacher_id: string }>('SELECT DISTINCT teacher_id FROM timetable_slots WHERE school_id = $1', [schoolId]);
  return rows.map((row) => row.teacher_id);
}

/** People who have relief arranged for one of their own periods that day, so are themselves away. */
export async function listAbsentTeacherIds(db: Queryable, schoolId: string, onDate: string): Promise<string[]> {
  const { rows } = await db.query<{ absent_teacher_id: string }>(
    'SELECT DISTINCT absent_teacher_id FROM relief_assignments WHERE school_id = $1 AND on_date = $2::date',
    [schoolId, onDate],
  );
  return rows.map((row) => row.absent_teacher_id);
}

/** Relief classes per person between two dates (inclusive), counting those arranged but not yet announced. */
export async function countReliefBetween(db: Queryable, schoolId: string, fromDate: string, toDate: string): Promise<Map<string, number>> {
  const { rows } = await db.query<{ relief_teacher_id: string; total: number }>(
    `SELECT relief_teacher_id, count(*)::int AS total FROM relief_assignments
      WHERE school_id = $1 AND on_date BETWEEN $2::date AND $3::date GROUP BY relief_teacher_id`,
    [schoolId, fromDate, toDate],
  );
  return new Map(rows.map((row) => [row.relief_teacher_id, row.total]));
}

export interface NewReliefRow {
  slot: SlotForRelief;
  onDate: string;
  reliefTeacherId: string;
  deliverAt: Date;
  createdBy: string;
  now: Date;
}

export async function insertRelief(db: Queryable, schoolId: string, relief: NewReliefRow): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO relief_assignments
       (school_id, slot_id, on_date, absent_teacher_id, relief_teacher_id, start_time, end_time, deliver_at, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      schoolId, relief.slot.id, relief.onDate, relief.slot.teacher_id, relief.reliefTeacherId, relief.slot.start_time,
      relief.slot.end_time, relief.deliverAt, relief.createdBy, relief.now,
    ],
  );
  return rows[0].id;
}

/** Removes the relief; returns what it was for the audit log and the cancellation notice, or null if there is none in this school. */
export async function deleteRelief(db: Queryable, schoolId: string, reliefId: string) {
  interface RemovedRow {
    /** Null once the period has been removed from the timetable (relief already over is kept). */
    slot_id: string | null;
    on_date: string;
    relief_teacher_id: string;
    absent_teacher_id: string;
    start_time: string;
    end_time: string;
    deliver_at: Date;
  }
  const { rows } = await db.query<RemovedRow>(
    `DELETE FROM relief_assignments WHERE school_id = $1 AND id = $2
     RETURNING slot_id, on_date::text AS on_date, relief_teacher_id, absent_teacher_id,
               to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time, deliver_at`,
    [schoolId, reliefId],
  );
  return rows[0] ?? null;
}

/** The relief arranged for one teacher's periods on one date. */
export async function listReliefForDay(db: Queryable, schoolId: string, absentTeacherId: string, onDate: string) {
  interface CoverRow {
    id: string;
    slot_id: string;
    relief_teacher_id: string;
    relief_teacher_name: string;
    deliver_at: Date;
  }
  const { rows } = await db.query<CoverRow>(
    `SELECT r.id, r.slot_id, r.relief_teacher_id, u.name AS relief_teacher_name, r.deliver_at
       FROM relief_assignments r JOIN users u ON u.id = r.relief_teacher_id AND u.school_id = r.school_id
      WHERE r.school_id = $1 AND r.absent_teacher_id = $2 AND r.on_date = $3::date`,
    [schoolId, absentTeacherId, onDate],
  );
  return rows;
}

interface DutyRow {
  id: string;
  on_date: string;
  start_time: string;
  end_time: string;
  class_id: string | null;
  class_name: string | null;
  subject_id: string | null;
  subject_name: string | null;
  label: string | null;
  absent_teacher_id: string;
  absent_teacher_name: string;
}

/**
 * The relief one person covers from a date on, soonest first. A duty still held (deliver_at in the future) is left out:
 * until then it does not exist for them, exactly as a held task does not.
 */
export async function listDuties(
  db: Queryable,
  schoolId: string,
  reliefTeacherId: string,
  fromDate: string,
  now: Date,
  limit: number,
): Promise<ReliefDuty[]> {
  const { rows } = await db.query<DutyRow>(
    `SELECT r.id, r.on_date::text AS on_date, to_char(r.start_time, 'HH24:MI') AS start_time, to_char(r.end_time, 'HH24:MI') AS end_time,
            s.class_id, c.name AS class_name, s.subject_id, j.name AS subject_name, s.label,
            r.absent_teacher_id, a.name AS absent_teacher_name
       FROM relief_assignments r
       JOIN timetable_slots s ON s.id = r.slot_id AND s.school_id = r.school_id
       JOIN users a ON a.id = r.absent_teacher_id AND a.school_id = r.school_id
       LEFT JOIN classes c ON c.id = s.class_id AND c.school_id = s.school_id
       LEFT JOIN subjects j ON j.id = s.subject_id AND j.school_id = s.school_id
      WHERE r.school_id = $1 AND r.relief_teacher_id = $2 AND r.on_date >= $3::date AND r.deliver_at <= $4
      ORDER BY r.on_date, r.start_time LIMIT $5`,
    [schoolId, reliefTeacherId, fromDate, now, limit],
  );
  return rows.map((row) => ({
    id: row.id,
    onDate: row.on_date,
    startTime: row.start_time,
    endTime: row.end_time,
    class: row.class_id && row.class_name ? { id: row.class_id, name: row.class_name } : null,
    subject: row.subject_id && row.subject_name ? { id: row.subject_id, name: row.subject_name } : null,
    label: row.label,
    absentTeacher: { id: row.absent_teacher_id, name: row.absent_teacher_name },
  }));
}

/** Relief periods of several people from a date on, for the capacity check: time covering a class is not free time. */
export async function listReliefTimes(db: Queryable, schoolId: string, teacherIds: readonly string[], fromDate: string) {
  const { rows } = await db.query<{ teacher_id: string; on_date: string; start_time: string; end_time: string }>(
    `SELECT relief_teacher_id AS teacher_id, on_date::text AS on_date,
            to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time
       FROM relief_assignments
      WHERE school_id = $1 AND relief_teacher_id = ANY($2::uuid[]) AND on_date >= $3::date`,
    [schoolId, teacherIds, fromDate],
  );
  return rows;
}
