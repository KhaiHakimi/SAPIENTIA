import { requireUser } from '@/features/auth/server/current-user.service';
import { lessonRecordSchema } from '@/features/lessons/schemas/lesson.schemas';
import { recordLesson } from '@/features/lessons/server/lessons.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * PUT /api/lessons/records: { slotId, onDate, status, reason?, note?, erphUrl? }. Records one period as held or not held,
 * or changes that record. Only the period's own teacher, or its relief teacher, may; anyone else gets 404.
 */
export const PUT = withApi(async (request) => {
  const clock = appClock();
  const actor = await requireUser(request, clock);
  const input = await readJson(request, lessonRecordSchema);
  return Response.json(await recordLesson(actor, input, clock));
});
