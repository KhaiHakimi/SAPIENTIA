import { requireUser } from '@/features/auth/server/current-user.service';
import { timetableQuerySchema } from '@/features/timetable/schemas/timetable.schemas';
import { getTimetable } from '@/features/timetable/server/timetable.service';
import { readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/timetable: my own week. GET /api/timetable?teacherId=: a colleague's week, administrators only (404 otherwise). */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  const { teacherId } = readQuery(request, timetableQuerySchema);
  return Response.json(await getTimetable(actor, teacherId));
});
