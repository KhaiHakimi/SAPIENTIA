import { requireUser } from '@/features/auth/server/current-user.service';
import { slotIdSchema } from '@/features/timetable/schemas/timetable.schemas';
import { removeTimetableSlot } from '@/features/timetable/server/timetable.service';
import { withApi } from '@/shared/server/api-handler';
import { NotFoundError } from '@/shared/server/app-errors';
import { appClock } from '@/shared/server/clock.service';

/** DELETE /api/timetable/slots/:id: administrators remove a period. */
export const DELETE = withApi(async (request, context: RouteContext<'/api/timetable/slots/[id]'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const parsed = slotIdSchema.safeParse((await context.params).id);
  if (!parsed.success) throw new NotFoundError();
  await removeTimetableSlot(actor, parsed.data);
  return new Response(null, { status: 204 });
});
