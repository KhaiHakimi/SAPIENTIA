import { requireUser } from '@/features/auth/server/current-user.service';
import { listMyReliefDuties } from '@/features/relief/server/relief.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/relief/mine: the caller's own relief duties from today on. A duty still held is not listed yet. */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  return Response.json({ items: await listMyReliefDuties(actor, appClock()) });
});
