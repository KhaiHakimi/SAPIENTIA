import { requireUser } from '@/features/auth/server/current-user.service';
import { materialIdSchema } from '@/features/materials/schemas/material.schemas';
import { removeMaterial } from '@/features/materials/server/materials.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** DELETE /api/materials/:id: removes a material and its file. The person who added it, or an administrator. */
export const DELETE = withApi(async (request, context: RouteContext<'/api/materials/[id]'>) => {
  const actor = await requireUser(request, appClock());
  const id = materialIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  await removeMaterial(actor, id.data);
  return new Response(null, { status: 204 });
});
