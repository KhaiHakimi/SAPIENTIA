import { listHomeworkForPupil } from '@/features/homework/server/homework.service';
import { requireStudent } from '@/features/students/server/current-student.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/student/homework: the signed-in pupil's class homework, with their own hand-in only. Pupils only. */
export const GET = withApi(async (request) => {
  const student = await requireStudent(request, appClock());
  return Response.json(await listHomeworkForPupil(student, appClock()));
});
