import { requireUser } from '@/features/auth/server/current-user.service';
import { homeworkIdSchema } from '@/features/homework/schemas/homework.schemas';
import { getHandIns } from '@/features/homework/server/homework.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/homework/:id/hand-ins: the class's current pupils by name, each with whether they handed in. The setter only. */
export const GET = withApi(async (request, context: RouteContext<'/api/homework/[id]/hand-ins'>) => {
  const actor = await requireUser(request, appClock());
  const id = homeworkIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  return Response.json(await getHandIns(actor, id.data));
});
