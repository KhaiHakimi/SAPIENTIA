import { linkIdSchema, refuseLinkSchema } from '@/features/guardians/schemas/guardians.schemas';
import { requireGuardian } from '@/features/guardians/server/current-guardian.service';
import { refuseLink } from '@/features/guardians/server/guardian-view.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** POST /api/guardian/links/:linkId/refusal: { reason } → 204. The guardian refuses one of their own active links. */
export const POST = withApi(async (request, context: RouteContext<'/api/guardian/links/[linkId]/refusal'>) => {
  const guardian = await requireGuardian(request, appClock());
  const linkId = linkIdSchema.safeParse((await context.params).linkId);
  if (!linkId.success) throw new NotFoundError();
  const { reason } = await readJson(request, refuseLinkSchema);
  await refuseLink(guardian, linkId.data, reason, appClock());
  return new Response(null, { status: 204 });
});
