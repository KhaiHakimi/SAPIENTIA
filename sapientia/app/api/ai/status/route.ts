import { requireUser } from '@/features/auth/server/current-user.service';
import { getAiStatus } from '@/features/task-drafts/server/task-draft.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/ai/status: which AI features are switched on, so screens show them only when they work. Any signed-in staff. */
export const GET = withApi(async (request) => {
  await requireUser(request, appClock());
  return Response.json(getAiStatus());
});
