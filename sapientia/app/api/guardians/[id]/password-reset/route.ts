import { requireUser } from '@/features/auth/server/current-user.service';
import { guardianIdSchema } from '@/features/guardians/schemas/guardians.schemas';
import { resetGuardianPassword } from '@/features/guardians/server/guardians.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** POST /api/guardians/:id/password-reset → 201 with a new slip; the guardian is signed out everywhere. Administrators only. */
export const POST = withApi(async (request, context: RouteContext<'/api/guardians/[id]/password-reset'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const id = guardianIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  return Response.json(await resetGuardianPassword(actor, id.data, appClock()), { status: 201 });
});
