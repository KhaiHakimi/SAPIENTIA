import { requireUser } from '@/features/auth/server/current-user.service';
import { reliefIdSchema } from '@/features/relief/schemas/relief.schemas';
import { cancelRelief } from '@/features/relief/server/relief.service';
import { withApi } from '@/shared/server/api-handler';
import { NotFoundError } from '@/shared/server/app-errors';
import { appClock } from '@/shared/server/clock.service';

/** DELETE /api/relief/:id: cancels a relief. Administrators only. */
export const DELETE = withApi(async (request, context: RouteContext<'/api/relief/[id]'>) => {
  const clock = appClock();
  const actor = await requireUser(request, clock, ['admin']);
  const id = reliefIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  await cancelRelief(actor, id.data, clock);
  return new Response(null, { status: 204 });
});
