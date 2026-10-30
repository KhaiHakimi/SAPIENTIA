import 'server-only';
import type { Queryable } from '@/shared/server/database.service';
import type { AssignmentStatus } from '../interfaces/task.interface';

/** Every function takes schoolId first and filters on it: no query here can reach another school's rows (plan Sprint 3). */

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_on: string;
  created_at: Date;
  created_by: string;
  creator_name: string;
}

export interface VisibleTaskRow extends TaskRow {
  my_status: AssignmentStatus | null;
}

// due_on is read as text: a pg Date would shift the calendar day by the server's time zone.
const TASK_COLUMNS = `t.id, t.title, t.description, t.due_on::text AS due_on, t.created_at, t.created_by, c.name AS creator_name`;

export async function insertTask(
  db: Queryable,
  schoolId: string,
  task: { createdBy: string; title: string; description?: string; dueOn: string; now: Date },
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO tasks (school_id, created_by, title, description, due_on, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
    [schoolId, task.createdBy, task.title, task.description ?? null, task.dueOn, task.now],
  );
  return rows[0].id;
}

export async function insertAssignments(db: Queryable, schoolId: string, taskId: string, userIds: readonly string[], now: Date) {
  await db.query(
    `INSERT INTO task_assignments (school_id, task_id, user_id, status_changed_at)
     SELECT $1, $2, user_id, $4 FROM unnest($3::uuid[]) AS user_id`,
    [schoolId, taskId, userIds, now],
  );
}

/**
 * The task if this user may see it (they sent it or it is assigned to them), with their own status; otherwise null. Callers
 * answer null with 404, so a task in another school or someone else's task looks the same as one that does not exist.
 */
export async function findVisibleTask(db: Queryable, schoolId: string, taskId: string, userId: string): Promise<VisibleTaskRow | null> {
  const { rows } = await db.query<VisibleTaskRow>(
    `SELECT ${TASK_COLUMNS}, a.status AS my_status
       FROM tasks t
       JOIN users c ON c.id = t.created_by AND c.school_id = t.school_id
       LEFT JOIN task_assignments a ON a.task_id = t.id AND a.school_id = t.school_id AND a.user_id = $3
      WHERE t.school_id = $1 AND t.id = $2 AND (t.created_by = $3 OR a.user_id IS NOT NULL)`,
    [schoolId, taskId, userId],
  );
  return rows[0] ?? null;
}

export async function countAssignments(db: Queryable, schoolId: string, taskId: string) {
  const { rows } = await db.query<{ total: number; done: number }>(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'done')::int AS done
       FROM task_assignments WHERE school_id = $1 AND task_id = $2`,
    [schoolId, taskId],
  );
  return rows[0];
}

export async function listAssignees(db: Queryable, schoolId: string, taskId: string) {
  const { rows } = await db.query<{ id: string; name: string; status: AssignmentStatus; completed_at: Date | null }>(
    `SELECT u.id, u.name, a.status, a.completed_at
       FROM task_assignments a JOIN users u ON u.id = a.user_id AND u.school_id = a.school_id
      WHERE a.school_id = $1 AND a.task_id = $2
      ORDER BY u.name, u.id`,
    [schoolId, taskId],
  );
  return rows;
}

/** Board column for one assignee, soonest due first. */
export async function listAssigned(
  db: Queryable,
  schoolId: string,
  userId: string,
  status: AssignmentStatus | undefined,
  limit: number,
  after: { dueOn: string; id: string } | null,
) {
  const { rows } = await db.query<TaskRow & { my_status: AssignmentStatus }>(
    `SELECT ${TASK_COLUMNS}, a.status AS my_status
       FROM task_assignments a
       JOIN tasks t ON t.id = a.task_id AND t.school_id = a.school_id
       JOIN users c ON c.id = t.created_by AND c.school_id = t.school_id
      WHERE a.school_id = $1 AND a.user_id = $2 AND ($3::assignment_status IS NULL OR a.status = $3)
        AND ($4::date IS NULL OR (t.due_on, t.id) > ($4::date, $5::uuid))
      ORDER BY t.due_on, t.id LIMIT $6`,
    [schoolId, userId, status ?? null, after?.dueOn ?? null, after?.id ?? null, limit + 1],
  );
  return rows;
}

/** Tasks this user sent, newest first, with how many assignees have finished. */
export async function listSent(
  db: Queryable,
  schoolId: string,
  userId: string,
  limit: number,
  after: { createdAt: string; id: string } | null,
) {
  const { rows } = await db.query<TaskRow & { assignee_count: number; done_count: number }>(
    `SELECT ${TASK_COLUMNS},
            (SELECT count(*)::int FROM task_assignments a WHERE a.task_id = t.id AND a.school_id = t.school_id) AS assignee_count,
            (SELECT count(*)::int FROM task_assignments a WHERE a.task_id = t.id AND a.school_id = t.school_id AND a.status = 'done') AS done_count
       FROM tasks t JOIN users c ON c.id = t.created_by AND c.school_id = t.school_id
      WHERE t.school_id = $1 AND t.created_by = $2
        AND ($3::timestamptz IS NULL OR (t.created_at, t.id) < ($3::timestamptz, $4::uuid))
      ORDER BY t.created_at DESC, t.id DESC LIMIT $5`,
    [schoolId, userId, after?.createdAt ?? null, after?.id ?? null, limit + 1],
  );
  return rows;
}

/** Changes only this user's own assignment. Returns the previous status, or null if the user is not an assignee. */
export async function updateOwnAssignment(
  db: Queryable,
  schoolId: string,
  taskId: string,
  userId: string,
  status: AssignmentStatus,
  now: Date,
): Promise<AssignmentStatus | null> {
  const { rows } = await db.query<{ previous: AssignmentStatus }>(
    `UPDATE task_assignments a
        SET status = $4::assignment_status, status_changed_at = $5,
            completed_at = CASE WHEN $4::assignment_status = 'done' THEN $5::timestamptz ELSE NULL END
       FROM (SELECT status FROM task_assignments WHERE school_id = $1 AND task_id = $2 AND user_id = $3 FOR UPDATE) old
      WHERE a.school_id = $1 AND a.task_id = $2 AND a.user_id = $3
      RETURNING old.status AS previous`,
    [schoolId, taskId, userId, status, now],
  );
  return rows[0]?.previous ?? null;
}

export async function insertComment(
  db: Queryable,
  schoolId: string,
  comment: { taskId: string; authorId: string; body: string; now: Date },
) {
  const { rows } = await db.query<{ id: string; created_at: Date }>(
    `INSERT INTO task_comments (school_id, task_id, author_id, body, created_at) VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [schoolId, comment.taskId, comment.authorId, comment.body, comment.now],
  );
  return rows[0];
}

/** The latest comments, returned oldest first for reading top to bottom. */
export async function listComments(db: Queryable, schoolId: string, taskId: string, limit: number) {
  const { rows } = await db.query<{ id: string; author_id: string; author_name: string; body: string; created_at: Date }>(
    `SELECT * FROM (
       SELECT m.id, m.author_id, u.name AS author_name, m.body, m.created_at
         FROM task_comments m JOIN users u ON u.id = m.author_id AND u.school_id = m.school_id
        WHERE m.school_id = $1 AND m.task_id = $2
        ORDER BY m.created_at DESC, m.id DESC LIMIT $3
     ) latest ORDER BY created_at, id`,
    [schoolId, taskId, limit],
  );
  return rows;
}
