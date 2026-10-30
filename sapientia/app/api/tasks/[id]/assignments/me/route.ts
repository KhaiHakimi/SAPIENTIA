import { requireUser } from '@/features/auth/server/current-user.service';
import { updateMyAssignmentSchema } from '@/features/tasks/schemas/tasks.schemas';
import { readTaskId } from '@/features/tasks/server/task-route.helpers';
import { setMyStatus } from '@/features/tasks/server/tasks.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** PATCH /api/tasks/:id/assignments/me: { status } moves the caller's own card. Not an assignee: 404. */
export const PATCH = withApi(async (request, context: RouteContext<'/api/tasks/[id]/assignments/me'>) => {
  const actor = await requireUser(request, appClock());
  const taskId = await readTaskId(context);
  const { status } = await readJson(request, updateMyAssignmentSchema);
  return Response.json(await setMyStatus(actor, taskId, status, appClock()));
});
