import { requireUser } from '@/features/auth/server/current-user.service';
import { homeworkIdSchema, updateHomeworkSchema } from '@/features/homework/schemas/homework.schemas';
import { removeHomework, updateHomework } from '@/features/homework/server/homework.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** PATCH /api/homework/:id: { marked } records that the marking is done, so its time stops counting. The setter only. */
export const PATCH = withApi(async (request, context: RouteContext<'/api/homework/[id]'>) => {
  const actor = await requireUser(request, appClock());
  const id = homeworkIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  const { marked } = await readJson(request, updateHomeworkSchema);
  return Response.json(await updateHomework(actor, id.data, marked, appClock()));
});

/** DELETE /api/homework/:id: removes the homework and its hand-ins. The setter only. */
export const DELETE = withApi(async (request, context: RouteContext<'/api/homework/[id]'>) => {
  const actor = await requireUser(request, appClock());
  const id = homeworkIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  await removeHomework(actor, id.data);
  return new Response(null, { status: 204 });
});
