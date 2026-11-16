import type { CurrentStudent } from '@/features/students/interfaces/student.interface';
import { requireStudent } from '@/features/students/server/current-student.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/student/me: the signed-in pupil, and whether they must still replace the slip's password. 401 otherwise. */
export const GET = withApi(async (request) => {
  const student = await requireStudent(request, appClock(), { allowPasswordChange: true });
  const { id, name, className, schoolName, username } = student;
  const body: CurrentStudent = {
    student: { id, name, className, schoolName, username },
    mustChangePassword: student.mustChangePassword,
  };
  return Response.json(body);
});
