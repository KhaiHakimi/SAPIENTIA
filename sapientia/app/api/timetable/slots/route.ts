import { requireUser } from '@/features/auth/server/current-user.service';
import { newSlotSchema } from '@/features/timetable/schemas/timetable.schemas';
import { addTimetableSlot } from '@/features/timetable/server/timetable.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/timetable/slots: { teacherId, weekday, startTime, endTime } with { classId, subjectId } for a lesson or { label }
 * for another duty. Administrators only. A period that overlaps another for the same teacher answers 409.
 */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const input = await readJson(request, newSlotSchema);
  return Response.json(await addTimetableSlot(actor, input), { status: 201 });
});
