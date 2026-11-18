import { linkIdSchema } from '@/features/guardians/schemas/guardians.schemas';
import { requireGuardian } from '@/features/guardians/server/current-guardian.service';
import { requestMeetingSchema } from '@/features/meetings/schemas/meetings.schemas';
import { getChildMeetings, requestMeeting } from '@/features/meetings/server/meetings.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

async function readLinkId(context: RouteContext<'/api/guardian/children/[linkId]/meetings'>): Promise<string> {
  const linkId = linkIdSchema.safeParse((await context.params).linkId);
  if (!linkId.success) throw new NotFoundError();
  return linkId.data;
}

/** GET /api/guardian/children/:linkId/meetings: the child's teachers the guardian may ask, and the requests made. */
export const GET = withApi(async (request, context: RouteContext<'/api/guardian/children/[linkId]/meetings'>) => {
  const guardian = await requireGuardian(request, appClock());
  return Response.json(await getChildMeetings(guardian, await readLinkId(context), appClock()));
});

/**
 * POST /api/guardian/children/:linkId/meetings: { teacherId, topic, timeOfDay } → 201. The request reaches the teacher in
 * working hours only; outside them it waits for the next working start (deliverAt in the response).
 */
export const POST = withApi(async (request, context: RouteContext<'/api/guardian/children/[linkId]/meetings'>) => {
  const guardian = await requireGuardian(request, appClock());
  const linkId = await readLinkId(context);
  const input = await readJson(request, requestMeetingSchema);
  return Response.json(await requestMeeting(guardian, linkId, input, appClock()), { status: 201 });
});
