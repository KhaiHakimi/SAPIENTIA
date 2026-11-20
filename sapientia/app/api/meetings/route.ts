import { requireUser } from '@/features/auth/server/current-user.service';
import { listMyMeetings } from '@/features/meetings/server/meetings.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * GET /api/meetings: guardians' meeting requests to the signed-in teacher that have reached them (a request made outside
 * working hours appears at the next working start). Waiting ones first, then those closed in the last 30 days.
 */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  return Response.json(await listMyMeetings(actor, appClock()));
});
