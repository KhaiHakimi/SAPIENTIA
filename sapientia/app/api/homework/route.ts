import { requireUser } from '@/features/auth/server/current-user.service';
import { setHomeworkSchema } from '@/features/homework/schemas/homework.schemas';
import { getMyHomework, setHomework } from '@/features/homework/server/homework.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/homework: the caller's lessons (the classes and subjects they may set homework for) and their own homework. */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  return Response.json(await getMyHomework(actor, appClock()));
});

/**
 * POST /api/homework: { classId, subjectId, title, details?, dueOn, markingMinutes?, markBy? } → 201. The class and subject
 * must be on the caller's own timetable. A third piece due the same day for the class is saved as flagged, never refused.
 */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  const input = await readJson(request, setHomeworkSchema);
  return Response.json(await setHomework(actor, input, appClock()), { status: 201 });
});
