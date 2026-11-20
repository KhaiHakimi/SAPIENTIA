import 'server-only';
import type { Queryable } from '@/shared/server/database.service';

/** Every function takes schoolId first and filters on it. */

/**
 * Open work with an estimate for these people: one row per unfinished assignment, whoever sent it and whether or not it has
 * been delivered yet (a held task is still work waiting for them), and one per piece of homework they set whose marking is
 * not done yet, due on the day they plan to finish marking (plan Phase 4). The due date is the assignee's own, so an
 * extension moves the work with it. Only the date and minutes leave this function, so the capacity check cannot show a
 * sender what a colleague has been asked to do. exceptTaskId leaves one task out, for asking "is there time for this task
 * itself?".
 */
export async function listCommitments(db: Queryable, schoolId: string, userIds: readonly string[], exceptTaskId: string | null = null) {
  const { rows } = await db.query<{ user_id: string; due_on: string; minutes: number }>(
    `SELECT a.user_id, COALESCE(a.due_on, t.due_on)::text AS due_on, t.estimated_minutes AS minutes
       FROM task_assignments a JOIN tasks t ON t.id = a.task_id AND t.school_id = a.school_id
      WHERE a.school_id = $1 AND a.user_id = ANY($2::uuid[]) AND a.status <> 'done' AND t.estimated_minutes IS NOT NULL
        AND ($3::uuid IS NULL OR t.id <> $3)
     UNION ALL
     SELECT h.set_by, h.mark_by::text, h.marking_minutes
       FROM homework h
      WHERE h.school_id = $1 AND h.set_by = ANY($2::uuid[]) AND h.marking_minutes IS NOT NULL AND h.marked_at IS NULL`,
    [schoolId, userIds, exceptTaskId],
  );
  return rows;
}

/**
 * Minutes of estimated, unfinished work due on or before a day, per person, for the workload shown when assigning: open
 * tasks and homework marking not yet done. People with none are left out. Totals only.
 */
export async function sumCommittedMinutes(db: Queryable, schoolId: string, untilDay: string) {
  const { rows } = await db.query<{ user_id: string; minutes: number }>(
    `SELECT user_id, sum(minutes)::int AS minutes FROM (
       SELECT a.user_id, t.estimated_minutes AS minutes
         FROM task_assignments a JOIN tasks t ON t.id = a.task_id AND t.school_id = a.school_id
        WHERE a.school_id = $1 AND a.status <> 'done' AND t.estimated_minutes IS NOT NULL
          AND COALESCE(a.due_on, t.due_on) <= $2::date
       UNION ALL
       SELECT h.set_by, h.marking_minutes
         FROM homework h
        WHERE h.school_id = $1 AND h.marking_minutes IS NOT NULL AND h.marked_at IS NULL AND h.mark_by <= $2::date
     ) work
     GROUP BY user_id`,
    [schoolId, untilDay],
  );
  return rows;
}
