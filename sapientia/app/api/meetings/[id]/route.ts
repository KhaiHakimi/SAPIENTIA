import { requireUser } from '@/features/auth/server/current-user.service';
import { answerMeetingSchema, meetingIdSchema } from '@/features/meetings/schemas/meetings.schemas';
import { answerMyMeeting } from '@/features/meetings/server/meetings.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * PATCH /api/meetings/:id: { answer: 'accept', date, time } or { answer: 'decline', reason }. The teacher asked only; the time
 * is school-local and must be inside working hours. 409 when the request is no longer waiting.
 */
export const PATCH = withApi(async (request, context: RouteContext<'/api/meetings/[id]'>) => {
  const actor = await requireUser(request, appClock());
  const id = meetingIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  const input = await readJson(request, answerMeetingSchema);
  return Response.json(await answerMyMeeting(actor, id.data, input, appClock()));
});
