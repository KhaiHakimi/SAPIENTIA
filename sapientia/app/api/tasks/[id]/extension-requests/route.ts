import { requireUser } from '@/features/auth/server/current-user.service';
import { newExtensionSchema } from '@/features/extensions/schemas/extension.schemas';
import { requestExtension } from '@/features/extensions/server/extensions.service';
import { readTaskId } from '@/features/tasks/server/task-route.helpers';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/tasks/:id/extension-requests: { requestedDueOn, reason? }. An assignee asks for a later date on their own
 * unfinished task. Not an assignee, held or done: 404. A request already open: 409.
 */
export const POST = withApi(async (request, context: RouteContext<'/api/tasks/[id]/extension-requests'>) => {
  const actor = await requireUser(request, appClock());
  const taskId = await readTaskId(context);
  const input = await readJson(request, newExtensionSchema);
  return Response.json(await requestExtension(actor, taskId, input, appClock()), { status: 201 });
});
