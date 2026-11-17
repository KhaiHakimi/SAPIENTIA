import { requireUser } from '@/features/auth/server/current-user.service';
import { homeworkPreviewSchema } from '@/features/homework/schemas/homework.schemas';
import { previewHomework } from '@/features/homework/server/homework.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/homework/preview: { classId, subjectId, dueOn, markingMinutes?, markBy? } → the class's homework that week (date
 * and subject only), the same-day warning and the marking-time check. A dry run: nothing is saved.
 */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  const input = await readJson(request, homeworkPreviewSchema);
  return Response.json(await previewHomework(actor, input, appClock()));
});
