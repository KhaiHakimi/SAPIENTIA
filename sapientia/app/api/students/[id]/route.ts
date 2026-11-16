import { requireUser } from '@/features/auth/server/current-user.service';
import { studentIdSchema, updateStudentSchema } from '@/features/students/schemas/students.schemas';
import { removeStudent, updateStudent } from '@/features/students/server/students.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** PATCH /api/students/:id: { name?, schoolNumber?, classId?, status? }. Disabling signs the pupil out. Administrators only. */
export const PATCH = withApi(async (request, context: RouteContext<'/api/students/[id]'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const id = studentIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  const input = await readJson(request, updateStudentSchema);
  return Response.json(await updateStudent(actor, id.data, input, appClock()));
});

/** DELETE /api/students/:id: removes a pupil who has left, with their class place and sessions. Administrators only. */
export const DELETE = withApi(async (request, context: RouteContext<'/api/students/[id]'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const id = studentIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  await removeStudent(actor, id.data);
  return new Response(null, { status: 204 });
});
