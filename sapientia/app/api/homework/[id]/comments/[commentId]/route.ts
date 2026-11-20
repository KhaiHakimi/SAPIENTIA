import { requireUser } from '@/features/auth/server/current-user.service';
import { commentIdSchema, hideCommentSchema, homeworkIdSchema } from '@/features/homework/schemas/homework.schemas';
import { hideHomeworkComment } from '@/features/homework/server/homework.service';
import { NotFoundError } from '@/shared/server/app-errors';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * PATCH /api/homework/:id/comments/:commentId: { hidden: true } → 204. Hides a comment from the pupil and their guardians;
 * it is kept, never edited or deleted. The setter only.
 */
export const PATCH = withApi(async (request, context: RouteContext<'/api/homework/[id]/comments/[commentId]'>) => {
  const actor = await requireUser(request, appClock());
  const params = await context.params;
  const id = homeworkIdSchema.safeParse(params.id);
  const commentId = commentIdSchema.safeParse(params.commentId);
  if (!id.success || !commentId.success) throw new NotFoundError();
  await readJson(request, hideCommentSchema);
  await hideHomeworkComment(actor, id.data, commentId.data, appClock());
  return new Response(null, { status: 204 });
});
