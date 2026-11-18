import { requireUser } from '@/features/auth/server/current-user.service';
import { guardianIdSchema, updateGuardianSchema } from '@/features/guardians/schemas/guardians.schemas';
import { removeGuardian, updateGuardian } from '@/features/guardians/server/guardians.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** PATCH /api/guardians/:id: { name?, status? }. Disabling signs the guardian out. Administrators only. */
export const PATCH = withApi(async (request, context: RouteContext<'/api/guardians/[id]'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const id = guardianIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  const input = await readJson(request, updateGuardianSchema);
  return Response.json(await updateGuardian(actor, id.data, input, appClock()));
});

/** DELETE /api/guardians/:id: removes a guardian with their links and sessions. Administrators only. */
export const DELETE = withApi(async (request, context: RouteContext<'/api/guardians/[id]'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const id = guardianIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  await removeGuardian(actor, id.data);
  return new Response(null, { status: 204 });
});
