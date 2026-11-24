import 'server-only';
import type { LessonStatus, NotHeldReason } from '@/features/lessons/interfaces/lesson.interface';
import type { Queryable } from '@/shared/server/database.service';
import type { LessonRecordFact, MonthlyTasks, ScheduledSlot, UrgentOverride } from '../interfaces/monthly-report.interface';

/**
 * The monthly report's reads. Every function takes schoolId first and filters on it. Days are school-local YYYY-MM-DD
 * strings; instants are the start of the first day and the start of the day after the last, in the school's zone. Counts
 * and totals only leave this file, apart from subject names and the reasons senders gave for urgent overrides.
 */

export interface ReportRange {
  from: string;
  to: string;
  fromAt: Date;
  /** Exclusive: the start of the day after `to`. */
  toAt: Date;
  timeZone: string;
}

/**
 * Lesson periods (those with a class) on the timetable now, with the school-local day each was added and, if its teacher's
 * login has been removed, the day that happened.
 */
export async function listLessonSlots(db: Queryable, schoolId: string, timeZone: string): Promise<ScheduledSlot[]> {
  const { rows } = await db.query<{
    id: string; weekday: number; subject_name: string | null; created_on: string; teacher_removed_on: string | null;
  }>(
    `SELECT s.id, s.weekday, sub.name AS subject_name, (s.created_at AT TIME ZONE $2)::date::text AS created_on,
            (u.removed_at AT TIME ZONE $2)::date::text AS teacher_removed_on
       FROM timetable_slots s
       JOIN users u ON u.id = s.teacher_id AND u.school_id = s.school_id
       LEFT JOIN subjects sub ON sub.id = s.subject_id AND sub.school_id = s.school_id
      WHERE s.school_id = $1 AND s.class_id IS NOT NULL`,
    [schoolId, timeZone],
  );
  return rows.map((row) => ({
    id: row.id, weekday: row.weekday, subjectName: row.subject_name, createdOn: row.created_on, teacherRemovedOn: row.teacher_removed_on,
  }));
}

/** Records of lessons (periods with a class) in the period. Notes and links are not read. */
export async function listLessonRecordFacts(db: Queryable, schoolId: string, range: ReportRange): Promise<LessonRecordFact[]> {
  const { rows } = await db.query<{
    slot_id: string | null; on_date: string; subject_name: string | null; status: LessonStatus; reason: NotHeldReason | null;
  }>(
    `SELECT slot_id, on_date::text AS on_date, subject_name, status, reason FROM lesson_records
      WHERE school_id = $1 AND on_date BETWEEN $2::date AND $3::date AND class_name IS NOT NULL`,
    [schoolId, range.from, range.to],
  );
  return rows.map((row) => ({
    slotId: row.slot_id, onDate: row.on_date, subjectName: row.subject_name, status: row.status, reason: row.reason,
  }));
}

/**
 * Relief arranged in the period, and how many of those classes were recorded as held. Once a period is removed, its relief
 * and its records both lose slot_id, so they are matched on what each copied: the date, the absent teacher and the start.
 */
export async function countRelief(db: Queryable, schoolId: string, range: ReportRange) {
  const { rows } = await db.query<{ arranged: number; recorded_held: number }>(
    `SELECT count(*)::int AS arranged, count(*) FILTER (WHERE l.status = 'held')::int AS recorded_held
       FROM relief_assignments r
       LEFT JOIN lesson_records l ON l.school_id = r.school_id AND l.on_date = r.on_date
        AND (l.slot_id = r.slot_id
          OR (r.slot_id IS NULL AND l.slot_id IS NULL AND l.scheduled_teacher_id = r.absent_teacher_id AND l.start_time = r.start_time))
      WHERE r.school_id = $1 AND r.on_date BETWEEN $2::date AND $3::date`,
    [schoolId, range.from, range.to],
  );
  return { arranged: rows[0].arranged, recordedHeld: rows[0].recorded_held };
}

/**
 * The task figures for the period. "Due" uses each assignee's own due date (an extension moves it) and counts delivered
 * tasks only; whether an assignment was done on time compares the school-local day it was finished with that date.
 */
export async function countTaskFigures(db: Queryable, schoolId: string, range: ReportRange): Promise<Omit<MonthlyTasks, 'urgentOverrides'>> {
  const { rows } = await db.query<{
    delivered: number; flagged: number; due: number; done_on_time: number; done_late: number; not_done: number;
    requested: number; approved: number; countered: number; pending: number;
  }>(
    `WITH due AS (
       SELECT a.status, (a.completed_at AT TIME ZONE $6)::date AS done_on, COALESCE(a.due_on, t.due_on) AS due_on
         FROM task_assignments a JOIN tasks t ON t.id = a.task_id AND t.school_id = a.school_id
        WHERE a.school_id = $1 AND t.delivered_at IS NOT NULL AND COALESCE(a.due_on, t.due_on) BETWEEN $4::date AND $5::date
     ), sent AS (
       SELECT deadline_flagged FROM tasks WHERE school_id = $1 AND created_at >= $2 AND created_at < $3
     ), asked AS (
       SELECT status FROM extension_requests WHERE school_id = $1 AND created_at >= $2 AND created_at < $3
     )
     SELECT
       (SELECT count(*) FROM tasks WHERE school_id = $1 AND delivered_at >= $2 AND delivered_at < $3)::int AS delivered,
       (SELECT count(*) FROM sent WHERE deadline_flagged)::int AS flagged,
       (SELECT count(*) FROM due)::int AS due,
       (SELECT count(*) FROM due WHERE status = 'done' AND done_on <= due_on)::int AS done_on_time,
       (SELECT count(*) FROM due WHERE status = 'done' AND done_on > due_on)::int AS done_late,
       (SELECT count(*) FROM due WHERE status <> 'done')::int AS not_done,
       (SELECT count(*) FROM asked)::int AS requested,
       (SELECT count(*) FROM asked WHERE status = 'approved')::int AS approved,
       (SELECT count(*) FROM asked WHERE status = 'countered')::int AS countered,
       (SELECT count(*) FROM asked WHERE status = 'pending')::int AS pending`,
    [schoolId, range.fromAt, range.toAt, range.from, range.to, range.timeZone],
  );
  const row = rows[0];
  return {
    delivered: row.delivered,
    due: row.due,
    doneOnTime: row.done_on_time,
    doneLate: row.done_late,
    notDone: row.not_done,
    flaggedDeadlines: row.flagged,
    extensions: { requested: row.requested, approved: row.approved, countered: row.countered, pending: row.pending },
  };
}

/** Tasks sent in the period that skipped held delivery: the count, and the first `limit` reasons, oldest first. */
export async function listUrgentOverrides(db: Queryable, schoolId: string, range: ReportRange, limit: number) {
  const { rows } = await db.query<{ on_date: string; urgent_reason: string; total: number }>(
    `SELECT (created_at AT TIME ZONE $4)::date::text AS on_date, urgent_reason, count(*) OVER ()::int AS total
       FROM tasks WHERE school_id = $1 AND urgent AND created_at >= $2 AND created_at < $3
      ORDER BY created_at, id LIMIT $5`,
    [schoolId, range.fromAt, range.toAt, range.timeZone, limit],
  );
  const listed: UrgentOverride[] = rows.map((row) => ({ onDate: row.on_date, reason: row.urgent_reason }));
  return { count: rows[0]?.total ?? 0, listed };
}

/** Active staff with at least one timetable period: the people the wellbeing averages are over. */
export async function listTeachingStaffIds(db: Queryable, schoolId: string): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT DISTINCT u.id FROM users u JOIN timetable_slots s ON s.teacher_id = u.id AND s.school_id = u.school_id
      WHERE u.school_id = $1 AND u.status = 'active'`,
    [schoolId],
  );
  return rows.map((row) => row.id);
}

/** Estimated minutes of task work due in the period for these people, as one total. */
export async function sumTaskMinutesDue(db: Queryable, schoolId: string, userIds: readonly string[], range: ReportRange): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    `SELECT COALESCE(sum(t.estimated_minutes), 0)::int AS total
       FROM task_assignments a JOIN tasks t ON t.id = a.task_id AND t.school_id = a.school_id
      WHERE a.school_id = $1 AND a.user_id = ANY($2::uuid[]) AND t.estimated_minutes IS NOT NULL
        AND COALESCE(a.due_on, t.due_on) BETWEEN $3::date AND $4::date`,
    [schoolId, userIds, range.from, range.to],
  );
  return rows[0].total;
}
