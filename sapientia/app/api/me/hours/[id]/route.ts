import { requireUser } from '@/features/auth/server/current-user.service';
import { hoursEntryIdSchema } from '@/features/hours/schemas/hours.schemas';
import { deleteHoursEntry } from '@/features/hours/server/hours.service';
import { withApi } from '@/shared/server/api-handler';
import { NotFoundError } from '@/shared/server/app-errors';
import { appClock } from '@/shared/server/clock.service';

/** DELETE /api/me/hours/:id: deletes one of the caller's own entries. Anyone else's is 404. */
export const DELETE = withApi(async (request, context: RouteContext<'/api/me/hours/[id]'>) => {
  const actor = await requireUser(request, appClock());
  const id = hoursEntryIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  await deleteHoursEntry(actor, id.data);
  return new Response(null, { status: 204 });
});
