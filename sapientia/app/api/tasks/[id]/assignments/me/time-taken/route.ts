import { requireUser } from '@/features/auth/server/current-user.service';
import { timeTakenSchema } from '@/features/tasks/schemas/tasks.schemas';
import { readTaskId } from '@/features/tasks/server/task-route.helpers';
import { setMyTimeTaken } from '@/features/tasks/server/tasks.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * PUT /api/tasks/:id/assignments/me/time-taken: { timeTaken } is under_1h, 1_to_3h, over_3h, or null to take the answer
 * back. Only on the caller's own finished task. Not an assignee: 404.
 */
export const PUT = withApi(async (request, context: RouteContext<'/api/tasks/[id]/assignments/me/time-taken'>) => {
  const actor = await requireUser(request, appClock());
  const taskId = await readTaskId(context);
  const { timeTaken } = await readJson(request, timeTakenSchema);
  return Response.json(await setMyTimeTaken(actor, taskId, timeTaken));
});
