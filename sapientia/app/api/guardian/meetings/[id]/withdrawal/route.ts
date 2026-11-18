import { requireGuardian } from '@/features/guardians/server/current-guardian.service';
import { meetingIdSchema } from '@/features/meetings/schemas/meetings.schemas';
import { withdrawGuardianMeeting } from '@/features/meetings/server/meetings.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** POST /api/guardian/meetings/:id/withdrawal → 204. The guardian withdraws their own request while it is still waiting. */
export const POST = withApi(async (request, context: RouteContext<'/api/guardian/meetings/[id]/withdrawal'>) => {
  const guardian = await requireGuardian(request, appClock());
  const id = meetingIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  await withdrawGuardianMeeting(guardian, id.data, appClock());
  return new Response(null, { status: 204 });
});
