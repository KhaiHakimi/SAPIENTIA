import { requireUser } from '@/features/auth/server/current-user.service';
import { previewDelivery } from '@/features/delivery/server/delivery-plan.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';
import { getPool } from '@/shared/server/database.service';

/** GET /api/delivery/preview: when a task sent now would reach its assignees. Senders and administrators. */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin', 'sender']);
  return Response.json(await previewDelivery(getPool(), actor.schoolId, appClock()));
});
