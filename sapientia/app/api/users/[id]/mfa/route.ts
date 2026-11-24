import { requireUser } from '@/features/auth/server/current-user.service';
import { passwordRequestSchema } from '@/features/mfa/schemas/mfa.schemas';
import { resetUserMfa } from '@/features/mfa/server/mfa.service';
import { userIdSchema } from '@/features/users/schemas/users.schemas';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * DELETE /api/users/:id/mfa: { password } → 204. Clears a colleague's authenticator (a lost phone) and signs them out
 * everywhere. Administrators of the same school only, with their password again (400 wrong_password); not their own (409),
 * and 404 when the colleague has none.
 */
export const DELETE = withApi(async (request, context: RouteContext<'/api/users/[id]/mfa'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const id = userIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  const { password } = await readJson(request, passwordRequestSchema);
  await resetUserMfa(actor, id.data, password, appClock());
  return new Response(null, { status: 204 });
});
