import { requireUser } from '@/features/auth/server/current-user.service';
import { updateUserStatusSchema, userIdSchema } from '@/features/users/schemas/users.schemas';
import { removeUser, updateUserStatus } from '@/features/users/server/users.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

async function readId(context: RouteContext<'/api/users/[id]'>): Promise<string> {
  const id = userIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  return id.data;
}

/**
 * PATCH /api/users/:id: { status: 'disabled' | 'active' }. Disabling signs the person out at once and stops sign-in; enabling
 * undoes it. Administrators only; not their own login, and never the school's last active administrator (409).
 */
export const PATCH = withApi(async (request, context: RouteContext<'/api/users/[id]'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const id = await readId(context);
  const input = await readJson(request, updateUserStatusSchema);
  return Response.json(await updateUserStatus(actor, id, input, appClock()));
});

/**
 * DELETE /api/users/:id → 204. Removes the login for good (plan Phase 4: access ends when a staff login is removed). Records
 * keep the name as former staff. Same rules as PATCH.
 */
export const DELETE = withApi(async (request, context: RouteContext<'/api/users/[id]'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  await removeUser(actor, await readId(context), appClock());
  return new Response(null, { status: 204 });
});
