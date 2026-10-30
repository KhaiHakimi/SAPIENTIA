import { requireUser } from '@/features/auth/server/current-user.service';
import { addCommentSchema } from '@/features/tasks/schemas/tasks.schemas';
import { readTaskId } from '@/features/tasks/server/task-route.helpers';
import { addComment } from '@/features/tasks/server/tasks.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** POST /api/tasks/:id/comments: { body }. The sender and assignees only; anyone else gets 404. */
export const POST = withApi(async (request, context: RouteContext<'/api/tasks/[id]/comments'>) => {
  const actor = await requireUser(request, appClock());
  const taskId = await readTaskId(context);
  const { body } = await readJson(request, addCommentSchema);
  return Response.json(await addComment(actor, taskId, body, appClock()), { status: 201 });
});
