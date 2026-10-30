import { eventIdSchema } from '@/features/delivery/schemas/delivery.schemas';
import { removeCalendarEvent } from '@/features/delivery/server/school-settings.service';
import { requireUser } from '@/features/auth/server/current-user.service';
import { withApi } from '@/shared/server/api-handler';
import { NotFoundError } from '@/shared/server/app-errors';
import { appClock } from '@/shared/server/clock.service';

/** DELETE /api/calendar/events/:id: administrators remove an entry made by mistake. */
export const DELETE = withApi(async (request, context: RouteContext<'/api/calendar/events/[id]'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const parsed = eventIdSchema.safeParse((await context.params).id);
  if (!parsed.success) throw new NotFoundError();
  await removeCalendarEvent(actor, parsed.data);
  return new Response(null, { status: 204 });
});
