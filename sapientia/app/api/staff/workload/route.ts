import { requireUser } from '@/features/auth/server/current-user.service';
import { getWeekWorkload } from '@/features/capacity/server/feasibility.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * GET /api/staff/workload: for each member of staff with any, the minutes of estimated, unfinished work due by the end of
 * this week. Totals only. Senders and administrators, to see who is already loaded before assigning.
 */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin', 'sender']);
  return Response.json(await getWeekWorkload(actor, appClock()));
});
