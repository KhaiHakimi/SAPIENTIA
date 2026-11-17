import { requireUser } from '@/features/auth/server/current-user.service';
import { handInSchema, homeworkIdSchema } from '@/features/homework/schemas/homework.schemas';
import { setHandIn } from '@/features/homework/server/homework.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** PUT /api/homework/:id/hand-ins/:studentId: { handedIn } ticks or unticks a paper hand-in. The setter only. */
export const PUT = withApi(async (request, context: RouteContext<'/api/homework/[id]/hand-ins/[studentId]'>) => {
  const actor = await requireUser(request, appClock());
  const params = await context.params;
  const homeworkId = homeworkIdSchema.safeParse(params.id);
  const studentId = homeworkIdSchema.safeParse(params.studentId);
  if (!homeworkId.success || !studentId.success) throw new NotFoundError();
  const { handedIn } = await readJson(request, handInSchema);
  return Response.json(await setHandIn(actor, { homeworkId: homeworkId.data, studentId: studentId.data }, handedIn, appClock()));
});
