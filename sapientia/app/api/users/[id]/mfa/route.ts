import { requireUser } from '@/features/auth/server/current-user.service';
import { resetUserMfa } from '@/features/mfa/server/mfa.service';
import { userIdSchema } from '@/features/users/schemas/users.schemas';
import { NotFoundError } from '@/shared/server/app-errors';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * DELETE /api/users/:id/mfa → 204. Clears a colleague's authenticator (a lost phone) and signs them out everywhere.
 * Administrators of the same school only; not their own (409), and 404 when the colleague has none.
 */
export const DELETE = withApi(async (request, context: RouteContext<'/api/users/[id]/mfa'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const id = userIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  await resetUserMfa(actor, id.data);
  return new Response(null, { status: 204 });
});
