import 'server-only';
import { type AuditEntry, type AuditRow, listEntityAudit, writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { assessAssignees } from '@/features/capacity/server/feasibility.service';
import { planDelivery, type DeliveryPlan } from '@/features/delivery/server/delivery-plan.service';
import { queueDeliveryNotice, scheduleDelivery } from '@/features/delivery/server/delivery-queue.service';
import { EXTENSIONS_SHOWN_MAX } from '@/features/extensions/constants/extension.constants';
import { listExtensions } from '@/features/extensions/server/extensions.repository';
import { findTaskTypeEstimate } from '@/features/school-data/server/school-data.repository';
import { listActiveStaff } from '@/features/users/server/users.repository';
import type { Page } from '@/shared/interfaces/api-error.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, type Queryable, withTransaction } from '@/shared/server/database.service';
import { runIdempotent, type StoredResponse } from '@/shared/server/idempotency.service';
import { decodeCursor, encodeCursor, toPage } from '@/shared/server/pagination';
import { COMMENTS_SHOWN_MAX } from '../constants/task.constants';
import type {
  AssignedTask, AssignmentStatus, CreateTaskRequest, SentTask, TaskActivity, TaskAssignee, TaskComment, TaskDetail, TimeTaken,
} from '../interfaces/task.interface';
import {
  countAssignments, findVisibleTask, insertAssignments, insertComment, insertTask, listAssigned, listAssignees, listComments,
  listSent, updateOwnAssignment, updateOwnTimeTaken,
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

/** The sender's own minutes win; otherwise the task type's usual estimate; null when neither was given. */
async function resolveEstimate(db: Queryable, schoolId: string, input: CreateTaskRequest): Promise<number | null> {
  if (!input.taskTypeId) return input.estimatedMinutes ?? null;
  const typical = await findTaskTypeEstimate(db, schoolId, input.taskTypeId);
  if (typical === null) throw new ValidationError({ taskTypeId: 'invalid_task_type' });
  return input.estimatedMinutes ?? typical;
}

/**
 * Creates a task for one or more staff in the sender's school (plan Sprints 3 and 4). Every assignee must be an active
 * account in that school. Outside working hours the task is held: saved now, with a delivery job in the same transaction,
 * and invisible to assignees until the next working morning. An urgent override delivers at once and records the reason.
 * With an estimate, the capacity rules run for every assignee: a deadline someone has no time for is never refused, but
 * the task is marked as flagged and the audit log records how many people it affects (plan Phase 2: warn, never block).
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
      const estimatedMinutes = await resolveEstimate(client, actor.schoolId, input);
      const shortOfTime = estimatedMinutes === null ? 0 : (await assessAssignees(client, actor.schoolId, {
        staff, calendar: plan.calendar, from: plan.deliverAt, dueOn: input.dueOn, neededMinutes: estimatedMinutes,
      })).filter((result) => !result.feasible).length;

      const now = clock.now();
      const taskId = await insertTask(client, actor.schoolId, {
        ...input, createdBy: actor.id, now, deliverAt: plan.deliverAt, deliveredAt: plan.deliveredAt, urgent: Boolean(input.urgent),
        estimatedMinutes, deadlineFlagged: shortOfTime > 0,
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
        ...(shortOfTime > 0 ? [{
          actorId: actor.id, action: 'task.deadline_flagged' as const, entityType: 'task' as const, entityId: taskId,
          metadata: { shortOfTime, estimatedMinutes },
        }] : []),
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
    dueOn: row.my_due_on,
    createdBy: { id: row.created_by, name: row.creator_name },
    myStatus: row.my_status,
    urgent: row.urgent,
    estimatedMinutes: row.estimated_minutes,
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
    deadlineFlagged: row.deadline_flagged,
    pendingExtensions: row.pending_extensions,
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
  // The sender sees every request; an assignee only their own.
  const extensions = await listExtensions(db, actor.schoolId, taskId, isSender ? null : actor.id, EXTENSIONS_SHOWN_MAX);
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
    estimatedMinutes: task.estimated_minutes,
    deadlineFlagged: task.deadline_flagged,
    timeZone,
    isSender,
    myStatus: task.my_status,
    myDueOn: task.my_due_on,
    myTimeTaken: task.my_time_taken,
    extensions,
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
  dueOn: row.due_on,
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

/**
 * The optional completion question (plan Phase 2): an assignee says roughly how long their finished task took, or takes
 * the answer back. It is never shown beside their name: it is only counted per task type, to correct that type's estimate.
 * Not an assignee: 404. Not finished yet: a field error. No audit entry, because nothing about the task changes.
 */
export async function setMyTimeTaken(
  actor: SessionUser,
  taskId: string,
  timeTaken: TimeTaken | null,
): Promise<{ timeTaken: TimeTaken | null }> {
  const db = getPool();
  if (await updateOwnTimeTaken(db, actor.schoolId, taskId, actor.id, timeTaken)) return { timeTaken };
  const task = await findVisibleTask(db, actor.schoolId, taskId, actor.id);
  if (!task || task.my_status === null) throw new NotFoundError();
  throw new ValidationError({ timeTaken: 'not_done' });
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
