import { requireUser } from '@/features/auth/server/current-user.service';
import { addLinkSchema, guardianIdSchema } from '@/features/guardians/schemas/guardians.schemas';
import { addLink } from '@/features/guardians/server/guardians.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** POST /api/guardians/:id/links: { studentId, relationship } → 201 with the guardian. Administrators only. */
export const POST = withApi(async (request, context: RouteContext<'/api/guardians/[id]/links'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const id = guardianIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  const input = await readJson(request, addLinkSchema);
  return Response.json(await addLink(actor, id.data, input, appClock()), { status: 201 });
});
