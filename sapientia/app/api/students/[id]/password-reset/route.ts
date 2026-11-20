import { requireUser } from '@/features/auth/server/current-user.service';
import { studentIdSchema } from '@/features/students/schemas/students.schemas';
import { resetStudentPassword } from '@/features/students/server/students.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/students/:id/password-reset → 201 with a new slip. The old password stops working and the pupil is signed out
 * everywhere. Administrators only.
 */
export const POST = withApi(async (request, context: RouteContext<'/api/students/[id]/password-reset'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const id = studentIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  return Response.json(await resetStudentPassword(actor, id.data, appClock()), { status: 201 });
});
