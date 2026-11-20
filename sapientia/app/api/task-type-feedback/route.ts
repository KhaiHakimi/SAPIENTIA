import { requireUser } from '@/features/auth/server/current-user.service';
import { listTaskTypeFeedback } from '@/features/school-data/server/school-data.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * GET /api/task-type-feedback: for each task type with enough answers, how many people said a finished task took under an
 * hour, one to three hours, or over three. Counts only, never who answered. Administrators only.
 */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  return Response.json({ items: await listTaskTypeFeedback(actor) });
});
