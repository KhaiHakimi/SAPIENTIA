import { requireUser } from '@/features/auth/server/current-user.service';
import { createTaskSchema, tasksQuerySchema } from '@/features/tasks/schemas/tasks.schemas';
import { readIdempotencyKey } from '@/features/tasks/server/task-route.helpers';
import { createTask, listAssignedTasks, listSentTasks } from '@/features/tasks/server/tasks.service';
import { readJson, readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';
import { pageQuerySchema } from '@/shared/server/pagination';

/**
 * GET /api/tasks?view=assigned[&status=]: my board, soonest due first.
 * GET /api/tasks?view=sent: tasks I sent, newest first; view=held: those still held. All paginate with ?limit= (25, max 100)
 * and ?cursor=.
 */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  const { view, status } = readQuery(request, tasksQuerySchema);
  const { limit, cursor } = readQuery(request, pageQuerySchema);
  const page = view === 'assigned'
    ? await listAssignedTasks(actor, status, limit, cursor)
    : await listSentTasks(actor, limit, cursor, view === 'held');
  return Response.json(page);
});

/** POST /api/tasks: senders and administrators. Send an Idempotency-Key header so a retry cannot create a second task. */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin', 'sender']);
  const idempotencyKey = readIdempotencyKey(request);
  const input = await readJson(request, createTaskSchema);
  const result = await createTask(actor, input, idempotencyKey, appClock());
  return Response.json(result.body, { status: result.status });
});
