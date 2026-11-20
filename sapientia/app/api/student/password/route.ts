import { changeStudentPasswordSchema } from '@/features/students/schemas/students.schemas';
import { requireStudent } from '@/features/students/server/current-student.service';
import { changeStudentPassword } from '@/features/students/server/student-auth.service';
import { studentSessionCookie } from '@/features/students/server/student-session.service';
import { clientAddress, readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * PUT /api/student/password: { currentPassword, newPassword } → 204 with a fresh session cookie. The pupil's other sessions
 * end. Allowed while the slip's password is still in use, since this is how it is replaced.
 */
export const PUT = withApi(async (request) => {
  const student = await requireStudent(request, appClock(), { allowPasswordChange: true });
  const input = await readJson(request, changeStudentPasswordSchema);
  const token = await changeStudentPassword(student, input, clientAddress(request), appClock());
  return new Response(null, { status: 204, headers: { 'Set-Cookie': studentSessionCookie(request, token) } });
});
