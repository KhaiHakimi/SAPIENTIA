import 'server-only';
import { DateTime } from 'luxon';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { Feasibility } from '@/features/capacity/interfaces/capacity.interface';
import { assessAssignees } from '@/features/capacity/server/feasibility.service';
import { loadWorkingCalendar } from '@/features/delivery/server/school-calendar.repository';
import { queueEventNotice } from '@/features/notifications/server/event-notice-queue.service';
import { findVisibleTask } from '@/features/tasks/server/tasks.repository';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, withTransaction, type Queryable } from '@/shared/server/database.service';
import type { ExtensionDecision, ExtensionRequest, ExtensionSuggestion, NewExtensionRequest } from '../interfaces/extension.interface';
import { decideExtension, findExtension, findOpenAssignment, insertExtension } from './extensions.repository';

const UNIQUE_VIOLATION = '23505';

/**
 * The assignee's own capacity figures for one of their tasks, from now to the date it is due for them. The task itself is
 * left out of their other work, or it would count against its own time.
 */
async function assessOwnTask(
  db: Queryable,
  actor: SessionUser,
  task: { id: string; dueOn: string; estimatedMinutes: number },
  now: Date,
): Promise<Feasibility> {
  const [assessed] = await assessAssignees(db, actor.schoolId, {
    staff: [{ id: actor.id, name: actor.name, role: actor.role }],
    calendar: await loadWorkingCalendar(db, actor.schoolId, now),
    from: now,
    dueOn: task.dueOn,
    neededMinutes: task.estimatedMinutes,
    exceptTaskId: task.id,
  });
  const { feasible, neededMinutes, freeMinutes, workingMinutes, teachingMinutes, committedMinutes, earliestDueOn } = assessed;
  return { feasible, neededMinutes, freeMinutes, workingMinutes, teachingMinutes, committedMinutes, earliestDueOn };
}

/**
 * What the request form starts from (plan Phase 2: "pre-filled with conflicts"): the assignee's own free time for this
 * task from now to their due date, and the earliest date by which it fits. A person sees only their own figures.
 */
export async function suggestExtension(actor: SessionUser, taskId: string, clock: Clock): Promise<ExtensionSuggestion> {
  const db = getPool();
  const assignment = await findOpenAssignment(db, actor.schoolId, taskId, actor.id);
  if (!assignment) throw new NotFoundError();
  if (assignment.estimated_minutes === null) return { dueOn: assignment.due_on, feasibility: null };
  const feasibility = await assessOwnTask(
    db, actor, { id: taskId, dueOn: assignment.due_on, estimatedMinutes: assignment.estimated_minutes }, clock.now(),
  );
  return { dueOn: assignment.due_on, feasibility };
}

/**
 * An assignee asks for a later date on their own, delivered, unfinished task. Anyone else gets 404. One request can be
 * open at a time. The request keeps the capacity figures worked out here, on the server, so the sender sees why in totals
 * the teacher cannot alter. The audit entry records the dates, never the reason. The sender is told by email and push at
 * the next working moment.
 */
export async function requestExtension(
  actor: SessionUser,
  taskId: string,
  input: NewExtensionRequest,
  clock: Clock,
): Promise<ExtensionRequest> {
  try {
    return await withTransaction(async (client) => {
      const assignment = await findOpenAssignment(client, actor.schoolId, taskId, actor.id);
      if (!assignment) throw new NotFoundError();
      const now = clock.now();
      const today = DateTime.fromJSDate(now, { zone: actor.timeZone }).toISODate() ?? '';
      if (input.requestedDueOn <= assignment.due_on) throw new ValidationError({ requestedDueOn: 'not_later' });
      if (input.requestedDueOn < today) throw new ValidationError({ requestedDueOn: 'past_date' });
      const figures = assignment.estimated_minutes === null
        ? null
        : await assessOwnTask(client, actor, { id: taskId, dueOn: assignment.due_on, estimatedMinutes: assignment.estimated_minutes }, now);

      const id = await insertExtension(client, actor.schoolId, {
        taskId, requestedBy: actor.id, currentDueOn: assignment.due_on, requestedDueOn: input.requestedDueOn, reason: input.reason,
        figures: figures && { neededMinutes: figures.neededMinutes, freeMinutes: figures.freeMinutes },
        now,
      });
      await writeAudit(client, actor.schoolId, [{
        actorId: actor.id, action: 'extension.requested', entityType: 'task', entityId: taskId,
        metadata: { requestId: id, requestedDueOn: input.requestedDueOn },
      }]);
      await queueEventNotice(client, { kind: 'extension.requested', schoolId: actor.schoolId, extensionId: id }, clock);
      return (await findExtension(client, actor.schoolId, taskId, id)) as ExtensionRequest;
    });
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      throw new ConflictError('There is already an open request for this task.', { requestedDueOn: 'already_pending' });
    }
    throw error;
  }
}

/**
 * The task's sender answers a request: accept the date asked for, or give another later date. Either way the assignee's
 * due date moves and the exchange stays on the task. Anyone but the sender gets 404; a request already answered gets 409.
 * The teacher is told at the next working moment.
 */
export async function answerExtension(
  actor: SessionUser,
  taskId: string,
  requestId: string,
  decision: ExtensionDecision,
  clock: Clock,
): Promise<ExtensionRequest> {
  return withTransaction(async (client) => {
    const task = await findVisibleTask(client, actor.schoolId, taskId, actor.id);
    if (!task || task.created_by !== actor.id) throw new NotFoundError();
    const request = await findExtension(client, actor.schoolId, taskId, requestId);
    if (!request) throw new NotFoundError();
    if (request.status !== 'pending') throw new ConflictError('This request has already been answered.');
    // Proposing the very date that was asked for is an approval, and is recorded as one.
    const dueOn = decision.decision === 'propose' && decision.dueOn !== request.requestedDueOn ? decision.dueOn : null;
    if (dueOn !== null && dueOn <= request.currentDueOn) throw new ValidationError({ dueOn: 'not_later' });

    const decided = await decideExtension(client, actor.schoolId, { taskId, requestId, decidedBy: actor.id, dueOn, now: clock.now() });
    // Lost a race with another answer between the read above and the update.
    if (!decided) throw new ConflictError('This request has already been answered.');
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: dueOn === null ? 'extension.approved' : 'extension.countered', entityType: 'task', entityId: taskId,
      metadata: { requestId, assigneeId: decided.requested_by, dueOn: decided.decided_due_on },
    }]);
    await queueEventNotice(client, { kind: 'extension.answered', schoolId: actor.schoolId, extensionId: requestId }, clock);
    return (await findExtension(client, actor.schoolId, taskId, requestId)) as ExtensionRequest;
  });
}
