import 'server-only';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { readCookie } from '@/shared/server/api-handler';
import { NotFoundError, UnauthenticatedError } from '@/shared/server/app-errors';
import { getPool, type Queryable } from '@/shared/server/database.service';
import { SESSION_COOKIE } from '../constants/session.constants';
import type { SessionUser, StaffRole } from '../interfaces/session-user.interface';
import { resolveSession } from './session.service';

/**
 * The signed-in user, or 401. With roles, anyone else gets 404: deny by default, and do not confirm that the endpoint or
 * record exists to someone who may not use it (plan Section 8).
 */
export async function requireUser(
  request: Request,
  clock: Clock,
  roles?: readonly StaffRole[],
  db: Queryable = getPool(),
): Promise<SessionUser> {
  const token = readCookie(request, SESSION_COOKIE);
  const user = token ? await resolveSession(db, token, clock) : null;
  if (!user) throw new UnauthenticatedError();
  if (roles && !roles.includes(user.role)) throw new NotFoundError();
  return user;
}
