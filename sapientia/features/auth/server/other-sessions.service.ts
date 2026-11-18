import 'server-only';
import { GUARDIAN_SESSION_COOKIE } from '@/features/guardians/constants/guardians.constants';
import { clearedGuardianSessionCookie, revokeGuardianSession } from '@/features/guardians/server/guardian-session.service';
import { STUDENT_SESSION_COOKIE } from '@/features/students/constants/students.constants';
import { clearedStudentSessionCookie, revokeStudentSession } from '@/features/students/server/student-session.service';
import { readCookie } from '@/shared/server/api-handler';
import { getPool } from '@/shared/server/database.service';
import { SESSION_COOKIE } from '../constants/session.constants';
import { clearedSessionCookie, revokeSession } from './session.service';

export type SessionKind = 'staff' | 'pupil' | 'guardian';

interface SessionKindHandling {
  cookie: string;
  revoke: (token: string) => Promise<void>;
  cleared: (request: Request) => string;
}

const KINDS: Record<SessionKind, SessionKindHandling> = {
  staff: { cookie: SESSION_COOKIE, revoke: (token) => revokeSession(getPool(), token), cleared: clearedSessionCookie },
  pupil: {
    cookie: STUDENT_SESSION_COOKIE, revoke: (token) => revokeStudentSession(getPool(), token), cleared: clearedStudentSessionCookie,
  },
  guardian: {
    cookie: GUARDIAN_SESSION_COOKIE, revoke: (token) => revokeGuardianSession(getPool(), token), cleared: clearedGuardianSessionCookie,
  },
};

/**
 * On a shared computer, whoever signs in must never act inside someone else's session: signing in as one kind (staff, pupil,
 * guardian) ends any session of the other kinds in this browser, on the server as well as the cookie. Returns the Set-Cookie
 * values that clear those cookies.
 */
export async function endOtherSessions(request: Request, keep: SessionKind): Promise<string[]> {
  const cleared: string[] = [];
  for (const [kind, handling] of Object.entries(KINDS) as [SessionKind, SessionKindHandling][]) {
    if (kind === keep) continue;
    const token = readCookie(request, handling.cookie);
    if (!token) continue;
    await handling.revoke(token);
    cleared.push(handling.cleared(request));
  }
  return cleared;
}
