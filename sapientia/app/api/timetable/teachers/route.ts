import { requireUser } from '@/features/auth/server/current-user.service';
import { listTeachersForTimetable } from '@/features/timetable/server/timetable.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * GET /api/timetable/teachers: active staff, and disabled or removed staff who still have periods, each with its status.
 * Administrators only: it backs the timetable and relief pickers, so periods left by someone who has gone can be handled.
 */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  return Response.json({ items: await listTeachersForTimetable(actor) });
});
