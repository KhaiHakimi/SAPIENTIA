import { requireUser } from '@/features/auth/server/current-user.service';
import { extensionDecisionSchema, extensionIdSchema } from '@/features/extensions/schemas/extension.schemas';
import { answerExtension } from '@/features/extensions/server/extensions.service';
import { readTaskId } from '@/features/tasks/server/task-route.helpers';
import { readJson, withApi } from '@/shared/server/api-handler';
import { NotFoundError } from '@/shared/server/app-errors';
import { appClock } from '@/shared/server/clock.service';

/**
 * PATCH /api/tasks/:id/extension-requests/:requestId: { decision: 'approve' } or { decision: 'propose', dueOn }. Only the
 * task's sender; anyone else gets 404. A request already answered: 409.
 */
export const PATCH = withApi(async (request, context: RouteContext<'/api/tasks/[id]/extension-requests/[requestId]'>) => {
  const actor = await requireUser(request, appClock(), ['admin', 'sender']);
  const taskId = await readTaskId(context);
  const requestId = extensionIdSchema.safeParse((await context.params).requestId);
  if (!requestId.success) throw new NotFoundError();
  const decision = await readJson(request, extensionDecisionSchema);
  return Response.json(await answerExtension(actor, taskId, requestId.data, decision, appClock()));
});
