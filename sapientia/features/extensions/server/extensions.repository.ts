import 'server-only';
import type { Queryable } from '@/shared/server/database.service';
import type { ExtensionRequest, ExtensionStatus } from '../interfaces/extension.interface';

/** Every function takes schoolId first and filters on it. */

interface ExtensionRow {
  id: string;
  requested_by: string;
  requester_name: string;
  current_due_on: string;
  requested_due_on: string;
  reason: string | null;
  needed_minutes: number | null;
  free_minutes: number | null;
  status: ExtensionStatus;
  decided_by: string | null;
  decider_name: string | null;
  decided_at: Date | null;
  decided_due_on: string | null;
  created_at: Date;
}

// Dates are read as text: a pg Date would shift the calendar day by the server's time zone.
const EXTENSION_COLUMNS = `e.id, e.requested_by, r.name AS requester_name, e.current_due_on::text AS current_due_on,
  e.requested_due_on::text AS requested_due_on, e.reason, e.needed_minutes, e.free_minutes, e.status, e.decided_by, d.name AS decider_name, e.decided_at,
  e.decided_due_on::text AS decided_due_on, e.created_at`;
const EXTENSION_JOINS = `JOIN users r ON r.id = e.requested_by AND r.school_id = e.school_id
  LEFT JOIN users d ON d.id = e.decided_by AND d.school_id = e.school_id`;

const toExtension = (row: ExtensionRow): ExtensionRequest => ({
  id: row.id,
  requestedBy: { id: row.requested_by, name: row.requester_name },
  currentDueOn: row.current_due_on,
  requestedDueOn: row.requested_due_on,
  reason: row.reason,
  neededMinutes: row.needed_minutes,
  freeMinutes: row.free_minutes,
  status: row.status,
  decidedBy: row.decided_by ? { id: row.decided_by, name: row.decider_name ?? '?' } : null,
  decidedAt: row.decided_at?.toISOString() ?? null,
  decidedDueOn: row.decided_due_on,
  createdAt: row.created_at.toISOString(),
});

/**
 * A request still waiting for the sender. Once the person who asked has finished the task there is nothing left to
 * decide, so their unanswered request is closed: left out of the lists and counts, and refused if answered. It opens again
 * if they move the task back.
 */
const OPEN_REQUEST = `e.status = 'pending' AND EXISTS (
  SELECT 1 FROM task_assignments ra
   WHERE ra.task_id = e.task_id AND ra.user_id = e.requested_by AND ra.school_id = e.school_id AND ra.status <> 'done')`;

/**
 * The task's requests, oldest first, without unanswered ones from people who have finished. With onlyBy, just that
 * person's: an assignee never sees a colleague's request.
 */
export async function listExtensions(
  db: Queryable,
  schoolId: string,
  taskId: string,
  onlyBy: string | null,
  limit: number,
): Promise<ExtensionRequest[]> {
  const { rows } = await db.query<ExtensionRow>(
    `SELECT ${EXTENSION_COLUMNS} FROM extension_requests e ${EXTENSION_JOINS}
      WHERE e.school_id = $1 AND e.task_id = $2 AND ($3::uuid IS NULL OR e.requested_by = $3)
        AND (e.status <> 'pending' OR ${OPEN_REQUEST})
      ORDER BY e.created_at, e.id LIMIT $4`,
    [schoolId, taskId, onlyBy, limit],
  );
  return rows.map(toExtension);
}

/**
 * This person's open assignment on a delivered task, with the date it is due for them and the task's estimate; null when
 * there is none (not assigned, held, already done, or another school), which callers answer with 404.
 */
export async function findOpenAssignment(db: Queryable, schoolId: string, taskId: string, userId: string) {
  const { rows } = await db.query<{ due_on: string; estimated_minutes: number | null }>(
    `SELECT COALESCE(a.due_on, t.due_on)::text AS due_on, t.estimated_minutes
       FROM task_assignments a JOIN tasks t ON t.id = a.task_id AND t.school_id = a.school_id
      WHERE a.school_id = $1 AND a.task_id = $2 AND a.user_id = $3 AND a.status <> 'done' AND t.delivered_at IS NOT NULL`,
    [schoolId, taskId, userId],
  );
  return rows[0] ?? null;
}

export interface NewExtensionRow {
  taskId: string;
  requestedBy: string;
  currentDueOn: string;
  requestedDueOn: string;
  reason?: string;
  /** Null when the task has no estimate. */
  figures: { neededMinutes: number; freeMinutes: number } | null;
  now: Date;
}

export async function insertExtension(db: Queryable, schoolId: string, request: NewExtensionRow): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO extension_requests
       (school_id, task_id, requested_by, current_due_on, requested_due_on, reason, needed_minutes, free_minutes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      schoolId, request.taskId, request.requestedBy, request.currentDueOn, request.requestedDueOn, request.reason ?? null,
      request.figures?.neededMinutes ?? null, request.figures?.freeMinutes ?? null, request.now,
    ],
  );
  return rows[0].id;
}

/**
 * Decides a pending request and moves that assignee's due date, in one statement so two decisions cannot both apply.
 * dueOn null means "the date asked for". Returns who asked and the date granted, or null if the request is not open,
 * not on this task, or the date is not later than the one it replaces.
 */
export async function decideExtension(
  db: Queryable,
  schoolId: string,
  decision: { taskId: string; requestId: string; decidedBy: string; dueOn: string | null; now: Date },
) {
  const { rows } = await db.query<{ requested_by: string; decided_due_on: string }>(
    `WITH decided AS (
       UPDATE extension_requests e
          SET status = CASE WHEN $5::date IS NULL THEN 'approved' ELSE 'countered' END::extension_status,
              decided_by = $4, decided_at = $6, decided_due_on = COALESCE($5::date, requested_due_on)
        WHERE e.school_id = $1 AND e.task_id = $2 AND e.id = $3 AND ${OPEN_REQUEST}
          AND COALESCE($5::date, requested_due_on) > current_due_on
        RETURNING task_id, requested_by, decided_due_on
     ), moved AS (
       UPDATE task_assignments a SET due_on = decided.decided_due_on FROM decided
        WHERE a.school_id = $1 AND a.task_id = decided.task_id AND a.user_id = decided.requested_by
     )
     SELECT requested_by, decided_due_on::text AS decided_due_on FROM decided`,
    [schoolId, decision.taskId, decision.requestId, decision.decidedBy, decision.dueOn, decision.now],
  );
  return rows[0] ?? null;
}

export async function findExtension(db: Queryable, schoolId: string, taskId: string, requestId: string): Promise<ExtensionRequest | null> {
  const { rows } = await db.query<ExtensionRow>(
    `SELECT ${EXTENSION_COLUMNS} FROM extension_requests e ${EXTENSION_JOINS}
      WHERE e.school_id = $1 AND e.task_id = $2 AND e.id = $3`,
    [schoolId, taskId, requestId],
  );
  return rows[0] ? toExtension(rows[0]) : null;
}

/** Whether the request is still waiting for an answer: pending, and the person who asked has not finished the task. */
export async function isRequestOpen(db: Queryable, schoolId: string, taskId: string, requestId: string): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM extension_requests e WHERE e.school_id = $1 AND e.task_id = $2 AND e.id = $3 AND ${OPEN_REQUEST}`,
    [schoolId, taskId, requestId],
  );
  return rows.length > 0;
}
