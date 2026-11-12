import 'server-only';
import type { Queryable } from '@/shared/server/database.service';

/** Every function takes schoolId first and filters on it. */

/**
 * Open work with an estimate for these people: one row per unfinished assignment, whoever sent it and whether or not it has
 * been delivered yet (a held task is still work waiting for them). The due date is the assignee's own, so an extension
 * moves the work with it. Only the date and minutes leave this function, so the capacity check cannot show a sender what a
 * colleague has been asked to do. exceptTaskId leaves one task out, for asking "is there time for this task itself?".
 */
export async function listCommitments(db: Queryable, schoolId: string, userIds: readonly string[], exceptTaskId: string | null = null) {
  const { rows } = await db.query<{ user_id: string; due_on: string; minutes: number }>(
    `SELECT a.user_id, COALESCE(a.due_on, t.due_on)::text AS due_on, t.estimated_minutes AS minutes
       FROM task_assignments a JOIN tasks t ON t.id = a.task_id AND t.school_id = a.school_id
      WHERE a.school_id = $1 AND a.user_id = ANY($2::uuid[]) AND a.status <> 'done' AND t.estimated_minutes IS NOT NULL
        AND ($3::uuid IS NULL OR t.id <> $3)`,
    [schoolId, userIds, exceptTaskId],
  );
  return rows;
}

/**
 * Minutes of estimated, unfinished work due on or before a day, per person, for the workload shown when assigning. People
 * with none are left out. Totals only.
 */
export async function sumCommittedMinutes(db: Queryable, schoolId: string, untilDay: string) {
  const { rows } = await db.query<{ user_id: string; minutes: number }>(
    `SELECT a.user_id, sum(t.estimated_minutes)::int AS minutes
       FROM task_assignments a JOIN tasks t ON t.id = a.task_id AND t.school_id = a.school_id
      WHERE a.school_id = $1 AND a.status <> 'done' AND t.estimated_minutes IS NOT NULL
        AND COALESCE(a.due_on, t.due_on) <= $2::date
      GROUP BY a.user_id`,
    [schoolId, untilDay],
  );
  return rows;
}
