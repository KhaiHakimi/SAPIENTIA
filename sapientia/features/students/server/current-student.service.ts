import 'server-only';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { readCookie } from '@/shared/server/api-handler';
import { PasswordChangeRequiredError, UnauthenticatedError } from '@/shared/server/app-errors';
import { getPool, type Queryable } from '@/shared/server/database.service';
import { STUDENT_SESSION_COOKIE } from '../constants/students.constants';
import type { SessionStudent } from '../interfaces/student.interface';
import { resolveStudentSession } from './student-session.service';

/**
 * The signed-in pupil, or 401. Reads only the pupil cookie, so a staff session is never accepted here. A pupil still on the
 * slip's password gets 403 password_change_required everywhere except the endpoints that allow it (who am I, change password).
 */
export async function requireStudent(
  request: Request,
  clock: Clock,
  options: { allowPasswordChange?: boolean } = {},
  db: Queryable = getPool(),
): Promise<SessionStudent> {
  const token = readCookie(request, STUDENT_SESSION_COOKIE);
  const student = token ? await resolveStudentSession(db, token, clock) : null;
  if (!student) throw new UnauthenticatedError();
  if (student.mustChangePassword && !options.allowPasswordChange) throw new PasswordChangeRequiredError();
  return student;
}
