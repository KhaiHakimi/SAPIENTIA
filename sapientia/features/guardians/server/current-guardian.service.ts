import 'server-only';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { readCookie } from '@/shared/server/api-handler';
import { PasswordChangeRequiredError, UnauthenticatedError } from '@/shared/server/app-errors';
import { getPool, type Queryable } from '@/shared/server/database.service';
import { GUARDIAN_SESSION_COOKIE } from '../constants/guardians.constants';
import type { SessionGuardian } from '../interfaces/guardian.interface';
import { resolveGuardianSession } from './guardian-session.service';

/**
 * The signed-in guardian, or 401. Reads only the guardian cookie, so staff and pupil sessions are never accepted here. A
 * guardian still on the slip's password gets 403 password_change_required except where allowed (who am I, change password).
 */
export async function requireGuardian(
  request: Request,
  clock: Clock,
  options: { allowPasswordChange?: boolean } = {},
  db: Queryable = getPool(),
): Promise<SessionGuardian> {
  const token = readCookie(request, GUARDIAN_SESSION_COOKIE);
  const guardian = token ? await resolveGuardianSession(db, token, clock) : null;
  if (!guardian) throw new UnauthenticatedError();
  if (guardian.mustChangePassword && !options.allowPasswordChange) throw new PasswordChangeRequiredError();
  return guardian;
}
