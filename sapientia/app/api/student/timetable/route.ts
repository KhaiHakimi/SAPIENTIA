import { requireStudent } from '@/features/students/server/current-student.service';
import { classWeekQuerySchema } from '@/features/timetable/schemas/timetable.schemas';
import { getClassWeek } from '@/features/timetable/server/class-week.service';
import { readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/student/timetable?weekOf=: the signed-in pupil's class timetable for that week, relief marked. Pupils only. */
export const GET = withApi(async (request) => {
  const student = await requireStudent(request, appClock());
  const { weekOf } = readQuery(request, classWeekQuerySchema);
  return Response.json(await getClassWeek(student, weekOf, appClock()));
});
