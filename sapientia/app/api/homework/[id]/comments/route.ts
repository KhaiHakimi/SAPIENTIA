import { requireUser } from '@/features/auth/server/current-user.service';
import { addCommentSchema, homeworkIdSchema } from '@/features/homework/schemas/homework.schemas';
import { addComment, getComments } from '@/features/homework/server/homework.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

async function readId(context: RouteContext<'/api/homework/[id]/comments'>): Promise<string> {
  const id = homeworkIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  return id.data;
}

/** GET /api/homework/:id/comments: every comment on this homework, hidden ones marked. The setter only. */
export const GET = withApi(async (request, context: RouteContext<'/api/homework/[id]/comments'>) => {
  const actor = await requireUser(request, appClock());
  return Response.json(await getComments(actor, await readId(context)));
});

/**
 * POST /api/homework/:id/comments: { studentId, body } → 201. A short note (300 characters) to one pupil of the class, which
 * the pupil and their guardians see; the pupil cannot reply. The setter only; audited with ids, never the text.
 */
export const POST = withApi(async (request, context: RouteContext<'/api/homework/[id]/comments'>) => {
  const actor = await requireUser(request, appClock());
  const id = await readId(context);
  const input = await readJson(request, addCommentSchema);
  return Response.json(await addComment(actor, id, input, appClock()), { status: 201 });
});
