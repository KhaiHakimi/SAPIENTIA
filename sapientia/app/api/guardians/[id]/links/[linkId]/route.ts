import { requireUser } from '@/features/auth/server/current-user.service';
import { guardianIdSchema, linkIdSchema, removeLinkSchema } from '@/features/guardians/schemas/guardians.schemas';
import { removeLink } from '@/features/guardians/server/guardians.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * PATCH /api/guardians/:id/links/:linkId: { reason } removes an active link with a reason code, and returns the guardian. A
 * link that is not active is 404. Administrators only.
 */
export const PATCH = withApi(async (request, context: RouteContext<'/api/guardians/[id]/links/[linkId]'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const params = await context.params;
  const id = guardianIdSchema.safeParse(params.id);
  const linkId = linkIdSchema.safeParse(params.linkId);
  if (!id.success || !linkId.success) throw new NotFoundError();
  const { reason } = await readJson(request, removeLinkSchema);
  return Response.json(await removeLink(actor, { guardianId: id.data, linkId: linkId.data }, reason, appClock()));
});
