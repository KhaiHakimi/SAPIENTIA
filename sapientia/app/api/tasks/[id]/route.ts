import { requireUser } from '@/features/auth/server/current-user.service';
import { readTaskId } from '@/features/tasks/server/task-route.helpers';
import { getTask } from '@/features/tasks/server/tasks.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/tasks/:id: for the sender and the assignees only; anyone else gets 404. */
export const GET = withApi(async (request, context: RouteContext<'/api/tasks/[id]'>) => {
  const actor = await requireUser(request, appClock());
  return Response.json(await getTask(actor, await readTaskId(context)));
});
