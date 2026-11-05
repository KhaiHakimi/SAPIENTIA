import 'server-only';
import { type AuditEntry, type AuditRow, listEntityAudit, writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { planDelivery, type DeliveryPlan } from '@/features/delivery/server/delivery-plan.service';
import { queueDeliveryNotice, scheduleDelivery } from '@/features/delivery/server/delivery-queue.service';
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

/** The due date cannot be before today, nor before the day the task actually reaches the assignees. */
function checkDueDate(dueOn: string, plan: DeliveryPlan): void {
  if (dueOn < plan.today) throw new ValidationError({ dueOn: 'past_date' });
  if (dueOn < plan.deliveryDay) throw new ValidationError({ dueOn: 'due_before_delivery' });
}

function deliveryAudit(actorId: string, taskId: string, input: CreateTaskRequest, plan: DeliveryPlan): AuditEntry[] {
  const entry = (action: AuditEntry['action'], metadata: AuditEntry['metadata']): AuditEntry =>
    ({ actorId, action, entityType: 'task', entityId: taskId, metadata });
  if (input.urgent) return [entry('task.urgent_override', {}), entry('task.delivered', { via: 'urgent' })];
  if (plan.deliveredAt) return [entry('task.delivered', { via: 'immediate' })];
  return [entry('task.held', { deliverAt: plan.deliverAt.toISOString() })];
}

/**
 * Creates a task for one or more staff in the sender's school (plan Sprints 3 and 4). Every assignee must be an active
 * account in that school. Outside working hours the task is held: saved now, with a delivery job in the same transaction,
 * and invisible to assignees until the next working morning. An urgent override delivers at once and records the reason.
 * With an Idempotency-Key, a retry returns the first result.
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
      const plan = await planDelivery(client, actor.schoolId, Boolean(input.urgent), clock);
      checkDueDate(input.dueOn, plan);

      const now = clock.now();
      const taskId = await insertTask(client, actor.schoolId, {
        ...input, createdBy: actor.id, now, deliverAt: plan.deliverAt, deliveredAt: plan.deliveredAt, urgent: Boolean(input.urgent),
      });
      await insertAssignments(client, actor.schoolId, taskId, input.assigneeIds, now);
      if (plan.deliveredAt) await queueDeliveryNotice(client, taskId);
      else await scheduleDelivery(client, taskId, plan.deliverAt);
      await writeAudit(client, actor.schoolId, [
        { actorId: actor.id, action: 'task.created', entityType: 'task', entityId: taskId, metadata: { assigneeCount: input.assigneeIds.length } },
        ...input.assigneeIds.map((assigneeId) => ({
          actorId: actor.id, action: 'task.assigned' as const, entityType: 'task' as const, entityId: taskId, metadata: { assigneeId },
        })),
        ...deliveryAudit(actor.id, taskId, input, plan),
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
    urgent: row.urgent,
  }), (row) => encodeCursor(row.due_on, row.id));
}

/** Tasks the caller sent, newest first; heldOnly is the held list (plan Sprint 4: senders see what is waiting). */
export async function listSentTasks(
  actor: SessionUser,
  limit: number,
  cursor: string | undefined,
  heldOnly = false,
): Promise<Page<SentTask>> {
  const after = decodeCursor(cursor);
  const rows = await listSent(getPool(), actor.schoolId, actor.id, limit, after && { createdAt: after.sortValue, id: after.id }, heldOnly);
  return toPage(rows, limit, (row) => ({
    id: row.id,
    title: row.title,
    dueOn: row.due_on,
    createdAt: row.created_at.toISOString(),
    assigneeCount: row.assignee_count,
    doneCount: row.done_count,
    deliverAt: row.deliver_at.toISOString(),
    deliveredAt: row.delivered_at?.toISOString() ?? null,
    urgent: row.urgent,
  }), (row) => encodeCursor(row.created_at.toISOString(), row.id));
}

export function getTask(actor: SessionUser, taskId: string): Promise<TaskDetail> {
  return loadDetail(getPool(), actor, taskId);
}

async function loadDetail(db: Queryable, actor: SessionUser, taskId: string): Promise<TaskDetail> {
  const task = await findVisibleTask(db, actor.schoolId, taskId, actor.id);
  if (!task) throw new NotFoundError();
  const isSender = task.created_by === actor.id;
  // One after another: db may be a single transaction client, which runs queries in turn anyway, and pg 9 drops support
  // for queuing several on one client at once.
  const { rows: schoolRows } = await db.query<{ time_zone: string }>('SELECT time_zone FROM schools WHERE id = $1', [actor.schoolId]);
  const timeZone = schoolRows[0].time_zone;
  const counts = await countAssignments(db, actor.schoolId, taskId);
  const comments = await listComments(db, actor.schoolId, taskId, COMMENTS_SHOWN_MAX);
  const assignees = isSender ? await listAssignees(db, actor.schoolId, taskId) : null;
  const activity = isSender ? await listEntityAudit(db, actor.schoolId, 'task', taskId) : null;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueOn: task.due_on,
    createdAt: task.created_at.toISOString(),
    createdBy: { id: task.created_by, name: task.creator_name },
    deliverAt: task.deliver_at.toISOString(),
    deliveredAt: task.delivered_at?.toISOString() ?? null,
    urgent: task.urgent,
    urgentReason: task.urgent_reason,
    timeZone,
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
