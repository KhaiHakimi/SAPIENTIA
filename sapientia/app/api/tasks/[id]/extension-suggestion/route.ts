import { requireUser } from '@/features/auth/server/current-user.service';
import { suggestExtension } from '@/features/extensions/server/extensions.service';
import { readTaskId } from '@/features/tasks/server/task-route.helpers';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * GET /api/tasks/:id/extension-suggestion: the caller's own free time for this task and the earliest date it fits, to
 * fill in an extension request. Only for their own unfinished, delivered task; otherwise 404.
 */
export const GET = withApi(async (request, context: RouteContext<'/api/tasks/[id]/extension-suggestion'>) => {
  const actor = await requireUser(request, appClock());
  return Response.json(await suggestExtension(actor, await readTaskId(context), appClock()));
});
