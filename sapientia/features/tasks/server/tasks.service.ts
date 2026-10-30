import 'server-only';
import { DateTime } from 'luxon';
import { type AuditRow, listEntityAudit, writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { listActiveStaff } from '@/features/users/server/users.repository';
import type { Page } from '@/shared/interfaces/api-error.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, type Queryable, withTransaction } from '@/shared/server/database.service';
import { runIdempotent, type StoredResponse } from '@/shared/server/idempotency.service';
import { decodeCursor, encodeCursor, toPage } from '@/shared/server/pagination';
import { COMMENTS_SHOWN_MAX } from '../constants/task.constants';
import type {
  AssignedTask, AssignmentStatus, CreateTaskRequest, SentTask, TaskActivity, TaskAssignee, TaskComment, TaskDetail,
} from '../interfaces/task.interface';
import {
  countAssignments, findVisibleTask, insertAssignments, insertComment, insertTask, listAssigned, listAssignees, listComments,
  listSent, updateOwnAssignment,
} from './tasks.repository';

async function schoolToday(db: Queryable, schoolId: string, clock: Clock): Promise<string> {
  const { rows } = await db.query<{ time_zone: string }>('SELECT time_zone FROM schools WHERE id = $1', [schoolId]);
  return DateTime.fromJSDate(clock.now(), { zone: rows[0].time_zone }).toISODate() ?? '';
}

/**
 * Creates a task for one or more staff in the sender's school. Every assignee must be an active account in that school;
 * the due date cannot be before today in the school's time zone. With an Idempotency-Key, a retry returns the first result.
 */
export async function createTask(
  actor: SessionUser,
  input: CreateTaskRequest,
  idempotencyKey: string | undefined,
  clock: Clock,
): Promise<StoredResponse<TaskDetail>> {
  return withTransaction(async (client) => {
    const create = async (): Promise<StoredResponse<TaskDetail>> => {
      const staff = await listActiveStaff(client, actor.schoolId, input.assigneeIds);
      if (staff.length !== input.assigneeIds.length) throw new ValidationError({ assigneeIds: 'invalid_assignee' });
      if (input.dueOn < (await schoolToday(client, actor.schoolId, clock))) throw new ValidationError({ dueOn: 'past_date' });

      const now = clock.now();
      const taskId = await insertTask(client, actor.schoolId, { ...input, createdBy: actor.id, now });
      await insertAssignments(client, actor.schoolId, taskId, input.assigneeIds, now);
      await writeAudit(client, actor.schoolId, [
        { actorId: actor.id, action: 'task.created', entityType: 'task', entityId: taskId, metadata: { assigneeCount: input.assigneeIds.length } },
        ...input.assigneeIds.map((assigneeId) => ({
          actorId: actor.id, action: 'task.assigned' as const, entityType: 'task' as const, entityId: taskId, metadata: { assigneeId },
        })),
      ]);
      return { status: 201, body: await loadDetail(client, actor, taskId) };
    };
    if (!idempotencyKey) return create();
    return runIdempotent(client, { schoolId: actor.schoolId, userId: actor.id, key: idempotencyKey }, input, create);
  });
}

export async function listAssignedTasks(
  actor: SessionUser,
  status: AssignmentStatus | undefined,
  limit: number,
  cursor: string | undefined,
): Promise<Page<AssignedTask>> {
  const after = decodeCursor(cursor);
  const rows = await listAssigned(getPool(), actor.schoolId, actor.id, status, limit, after && { dueOn: after.sortValue, id: after.id });
  return toPage(rows, limit, (row) => ({
    id: row.id,
    title: row.title,
    dueOn: row.due_on,
    createdBy: { id: row.created_by, name: row.creator_name },
    myStatus: row.my_status,
  }), (row) => encodeCursor(row.due_on, row.id));
}

export async function listSentTasks(actor: SessionUser, limit: number, cursor: string | undefined): Promise<Page<SentTask>> {
  const after = decodeCursor(cursor);
  const rows = await listSent(getPool(), actor.schoolId, actor.id, limit, after && { createdAt: after.sortValue, id: after.id });
  return toPage(rows, limit, (row) => ({
    id: row.id,
    title: row.title,
    dueOn: row.due_on,
    createdAt: row.created_at.toISOString(),
    assigneeCount: row.assignee_count,
    doneCount: row.done_count,
  }), (row) => encodeCursor(row.created_at.toISOString(), row.id));
}

export function getTask(actor: SessionUser, taskId: string): Promise<TaskDetail> {
  return loadDetail(getPool(), actor, taskId);
}

async function loadDetail(db: Queryable, actor: SessionUser, taskId: string): Promise<TaskDetail> {
  const task = await findVisibleTask(db, actor.schoolId, taskId, actor.id);
  if (!task) throw new NotFoundError();
  const isSender = task.created_by === actor.id;
  const [counts, comments, assignees, activity] = await Promise.all([
    countAssignments(db, actor.schoolId, taskId),
    listComments(db, actor.schoolId, taskId, COMMENTS_SHOWN_MAX),
    isSender ? listAssignees(db, actor.schoolId, taskId) : null,
    isSender ? listEntityAudit(db, actor.schoolId, 'task', taskId) : null,
  ]);
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueOn: task.due_on,
    createdAt: task.created_at.toISOString(),
    createdBy: { id: task.created_by, name: task.creator_name },
    isSender,
    myStatus: task.my_status,
    assigneeCount: counts.total,
    doneCount: counts.done,
    assignees: assignees?.map(toAssignee) ?? null,
    activity: activity?.map(toActivity) ?? null,
    comments: comments.map(toComment),
  };
}

type AssigneeRow = Awaited<ReturnType<typeof listAssignees>>[number];
type CommentRow = Awaited<ReturnType<typeof listComments>>[number];

const toAssignee = (row: AssigneeRow): TaskAssignee => ({
  id: row.id,
  name: row.name,
  status: row.status,
  completedAt: row.completed_at?.toISOString() ?? null,
});

const toActivity = (row: AuditRow): TaskActivity => ({
  id: row.id,
  action: row.action,
  actor: row.actor_id ? { id: row.actor_id, name: row.actor_name ?? '?' } : null,
  metadata: row.metadata,
  createdAt: row.created_at.toISOString(),
});

const toComment = (row: CommentRow): TaskComment => ({
  id: row.id,
  author: { id: row.author_id, name: row.author_name },
  body: row.body,
  createdAt: row.created_at.toISOString(),
});

/** An assignee moves their own card. Anyone else, including the sender, gets 404: there is no way to move someone else's. */
export async function setMyStatus(
  actor: SessionUser,
  taskId: string,
  status: AssignmentStatus,
  clock: Clock,
): Promise<{ status: AssignmentStatus }> {
  return withTransaction(async (client) => {
    const previous = await updateOwnAssignment(client, actor.schoolId, taskId, actor.id, status, clock.now());
    if (!previous) throw new NotFoundError();
    if (previous !== status) {
      await writeAudit(client, actor.schoolId, [
        {
          actorId: actor.id, action: 'assignment.status_changed', entityType: 'task', entityId: taskId,
          metadata: { from: previous, to: status },
        },
      ]);
    }
    return { status };
  });
}

/** The sender and the assignees may comment; the audit entry records that a comment exists, never its text. */
export async function addComment(actor: SessionUser, taskId: string, body: string, clock: Clock): Promise<TaskComment> {
  return withTransaction(async (client) => {
    if (!(await findVisibleTask(client, actor.schoolId, taskId, actor.id))) throw new NotFoundError();
    const row = await insertComment(client, actor.schoolId, { taskId, authorId: actor.id, body, now: clock.now() });
    await writeAudit(client, actor.schoolId, [
      { actorId: actor.id, action: 'comment.added', entityType: 'task', entityId: taskId, metadata: { commentId: row.id } },
    ]);
    return { id: row.id, author: { id: actor.id, name: actor.name }, body, createdAt: row.created_at.toISOString() };
  });
}
