import 'server-only';
import type { Queryable } from '@/shared/server/database.service';

/** Every function takes schoolId first and filters on it. */

/**
 * Open work with an estimate for these people: one row per unfinished assignment, whoever sent it and whether or not it has
 * been delivered yet (a held task is still work waiting for them). Only the due date and minutes leave this function, so
 * the capacity check cannot show a sender what a colleague has been asked to do.
 */
export async function listCommitments(db: Queryable, schoolId: string, userIds: readonly string[]) {
  const { rows } = await db.query<{ user_id: string; due_on: string; minutes: number }>(
    `SELECT a.user_id, t.due_on::text AS due_on, t.estimated_minutes AS minutes
       FROM task_assignments a JOIN tasks t ON t.id = a.task_id AND t.school_id = a.school_id
      WHERE a.school_id = $1 AND a.user_id = ANY($2::uuid[]) AND a.status <> 'done' AND t.estimated_minutes IS NOT NULL`,
    [schoolId, userIds],
  );
  return rows;
}
