import 'server-only';
import { sessionCookieHeader } from '@/features/auth/server/cookie.service';
import { generateToken, hashToken } from '@/features/auth/server/token.service';
import type { Clock } from '@/shared/interfaces/clock.interface';
import type { Queryable } from '@/shared/server/database.service';
import {
  GUARDIAN_SESSION_ABSOLUTE_HOURS,
  GUARDIAN_SESSION_COOKIE,
  GUARDIAN_SESSION_IDLE_MINUTES,
  GUARDIAN_SESSION_TOUCH_MINUTES,
} from '../constants/guardians.constants';
import type { SessionGuardian } from '../interfaces/guardian.interface';

/**
 * Guardian sessions: the same design as staff and pupil sessions (random token in an HttpOnly cookie, only its hash stored,
 * idle and absolute limits) in their own table and cookie, so a guardian session never passes a staff or pupil check.
 */

const MINUTE_MS = 60_000;

interface SessionRow {
  session_id: string;
  last_seen_at: Date;
  expires_at: Date;
  id: string;
  school_id: string;
  school_name: string;
  time_zone: string;
  name: string;
  username: string;
  must_change_password: boolean;
}

export async function createGuardianSession(db: Queryable, schoolId: string, guardianId: string, clock: Clock): Promise<string> {
  const token = generateToken();
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + GUARDIAN_SESSION_ABSOLUTE_HOURS * 60 * MINUTE_MS);
  await db.query(
    `INSERT INTO guardian_sessions (token_hash, school_id, guardian_id, created_at, last_seen_at, expires_at) VALUES ($1, $2, $3, $4, $4, $5)`,
    [hashToken(token), schoolId, guardianId, now, expiresAt],
  );
  return token;
}

/** The guardian behind a token, or null when it is unknown, idle too long, past its limit, or the account is disabled. */
export async function resolveGuardianSession(db: Queryable, token: string, clock: Clock): Promise<SessionGuardian | null> {
  const { rows } = await db.query<SessionRow>(
    `SELECT gs.id AS session_id, gs.last_seen_at, gs.expires_at, g.id, g.school_id, sc.name AS school_name, sc.time_zone,
            g.name, g.username, g.must_change_password
       FROM guardian_sessions gs
       JOIN guardians g ON g.id = gs.guardian_id AND g.school_id = gs.school_id
       JOIN schools sc ON sc.id = g.school_id
      WHERE gs.token_hash = $1 AND g.status = 'active'`,
    [hashToken(token)],
  );
  const row = rows[0];
  if (!row) return null;

  const now = clock.now().getTime();
  const idleLimit = row.last_seen_at.getTime() + GUARDIAN_SESSION_IDLE_MINUTES * MINUTE_MS;
  if (now >= row.expires_at.getTime() || now >= idleLimit) {
    await db.query('DELETE FROM guardian_sessions WHERE id = $1', [row.session_id]);
    return null;
  }
  if (now - row.last_seen_at.getTime() >= GUARDIAN_SESSION_TOUCH_MINUTES * MINUTE_MS) {
    await db.query('UPDATE guardian_sessions SET last_seen_at = $2 WHERE id = $1', [row.session_id, clock.now()]);
  }
  return {
    id: row.id, schoolId: row.school_id, schoolName: row.school_name, timeZone: row.time_zone, name: row.name,
    username: row.username, mustChangePassword: row.must_change_password,
  };
}

export async function revokeGuardianSession(db: Queryable, token: string): Promise<void> {
  await db.query('DELETE FROM guardian_sessions WHERE token_hash = $1', [hashToken(token)]);
}

export function guardianSessionCookie(request: Request, token: string): string {
  return sessionCookieHeader(request, GUARDIAN_SESSION_COOKIE, token, GUARDIAN_SESSION_ABSOLUTE_HOURS * 3600);
}

export function clearedGuardianSessionCookie(request: Request): string {
  return sessionCookieHeader(request, GUARDIAN_SESSION_COOKIE, '', 0);
}
