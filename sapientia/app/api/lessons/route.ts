import { requireUser } from '@/features/auth/server/current-user.service';
import { lessonDayQuerySchema } from '@/features/lessons/schemas/lesson.schemas';
import { getLessonDay } from '@/features/lessons/server/lessons.service';
import { readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/lessons?onDate=: the caller's own periods on the date, and colleagues' periods they cover, with their records. */
export const GET = withApi(async (request) => {
  const clock = appClock();
  const actor = await requireUser(request, clock);
  const { onDate } = readQuery(request, lessonDayQuerySchema);
  return Response.json(await getLessonDay(actor, onDate, clock));
});
