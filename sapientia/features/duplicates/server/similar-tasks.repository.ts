import 'server-only';
import type { Queryable } from '@/shared/server/database.service';

export interface CandidateTaskRow {
  id: string;
  title: string;
  due_on: string;
  created_by: string;
  creator_name: string;
  shared_assignees: number;
}

/**
 * Recent tasks someone could be about to send again: in this school, created since `since`, not yet finished by everyone,
 * and either sent by the caller or already given to one of the people chosen. Nothing else is compared, so a sender never
 * learns the titles of tasks unrelated to the people they are writing to.
 */
export async function listCandidateTasks(
  db: Queryable,
  schoolId: string,
  actorId: string,
  assigneeIds: readonly string[],
  since: Date,
  limit: number,
): Promise<CandidateTaskRow[]> {
  const { rows } = await db.query<CandidateTaskRow>(
    `SELECT t.id, t.title, t.due_on::text AS due_on, t.created_by, c.name AS creator_name,
            (SELECT count(*)::int FROM task_assignments a
              WHERE a.school_id = t.school_id AND a.task_id = t.id AND a.user_id = ANY($3::uuid[])) AS shared_assignees
       FROM tasks t JOIN users c ON c.id = t.created_by AND c.school_id = t.school_id
      WHERE t.school_id = $1 AND t.created_at > $4
        AND EXISTS (SELECT 1 FROM task_assignments a WHERE a.school_id = t.school_id AND a.task_id = t.id AND a.status <> 'done')
        AND (t.created_by = $2 OR EXISTS (
          SELECT 1 FROM task_assignments a WHERE a.school_id = t.school_id AND a.task_id = t.id AND a.user_id = ANY($3::uuid[])
        ))
      ORDER BY t.created_at DESC LIMIT $5`,
    [schoolId, actorId, assigneeIds, since, limit],
  );
  return rows;
}
