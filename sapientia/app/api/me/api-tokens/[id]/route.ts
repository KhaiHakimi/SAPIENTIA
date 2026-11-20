import { requireUser } from '@/features/auth/server/current-user.service';
import { apiTokenIdSchema } from '@/features/mcp/schemas/api-token.schemas';
import { revokeMyToken } from '@/features/mcp/server/api-tokens.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** DELETE /api/me/api-tokens/:id: revokes one of my own tokens at once. Anyone else's, or an unknown id, is 404. */
export const DELETE = withApi(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser(request, appClock());
  const id = apiTokenIdSchema.safeParse((await params).id);
  if (!id.success) throw new NotFoundError();
  await revokeMyToken(actor, id.data, appClock());
  return new Response(null, { status: 204 });
});
