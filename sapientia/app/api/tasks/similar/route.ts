import { requireUser } from '@/features/auth/server/current-user.service';
import { similarTasksRequestSchema } from '@/features/duplicates/schemas/similar-tasks.schemas';
import { findSimilarTasks } from '@/features/duplicates/server/similar-tasks.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/tasks/similar: { title, assigneeIds? }. A dry run like the feasibility check: up to three open tasks that look
 * like this one, sent by the caller or already given to someone chosen. Nothing is saved. Senders and administrators only.
 */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin', 'sender']);
  const input = await readJson(request, similarTasksRequestSchema);
  return Response.json(await findSimilarTasks(actor, input, appClock()));
});
