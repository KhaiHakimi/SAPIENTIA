import 'server-only';
import { sessionCookieHeader } from '@/features/auth/server/cookie.service';
import { generateToken, hashToken } from '@/features/auth/server/token.service';
import type { Clock } from '@/shared/interfaces/clock.interface';
import type { Queryable } from '@/shared/server/database.service';
import {
  STUDENT_SESSION_ABSOLUTE_HOURS,
  STUDENT_SESSION_COOKIE,
  STUDENT_SESSION_IDLE_MINUTES,
  STUDENT_SESSION_TOUCH_MINUTES,
} from '../constants/students.constants';
import type { SessionStudent } from '../interfaces/student.interface';

/**
 * Pupil sessions: the same design as staff sessions (random token in an HttpOnly cookie, only its hash stored, idle and
 * absolute limits) in their own table and cookie, so a pupil session can never pass a staff check or the other way round.
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
  class_name: string | null;
}

export async function createStudentSession(db: Queryable, schoolId: string, studentId: string, clock: Clock): Promise<string> {
  const token = generateToken();
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + STUDENT_SESSION_ABSOLUTE_HOURS * 60 * MINUTE_MS);
  await db.query(
    `INSERT INTO student_sessions (token_hash, school_id, student_id, created_at, last_seen_at, expires_at) VALUES ($1, $2, $3, $4, $4, $5)`,
    [hashToken(token), schoolId, studentId, now, expiresAt],
  );
  return token;
}

/** The pupil behind a token, or null when it is unknown, idle too long, past its limit, or the account is disabled. */
export async function resolveStudentSession(db: Queryable, token: string, clock: Clock): Promise<SessionStudent | null> {
  const { rows } = await db.query<SessionRow>(
    `SELECT ss.id AS session_id, ss.last_seen_at, ss.expires_at, s.id, s.school_id, sc.name AS school_name, sc.time_zone,
            s.name, s.username, s.must_change_password, c.name AS class_name
       FROM student_sessions ss
       JOIN students s ON s.id = ss.student_id AND s.school_id = ss.school_id
       JOIN schools sc ON sc.id = s.school_id
       LEFT JOIN class_enrolments e ON e.student_id = s.id AND e.school_id = s.school_id
       LEFT JOIN classes c ON c.id = e.class_id AND c.school_id = e.school_id
      WHERE ss.token_hash = $1 AND s.status = 'active'`,
    [hashToken(token)],
  );
  const row = rows[0];
  if (!row) return null;

  const now = clock.now().getTime();
  const idleLimit = row.last_seen_at.getTime() + STUDENT_SESSION_IDLE_MINUTES * MINUTE_MS;
  if (now >= row.expires_at.getTime() || now >= idleLimit) {
    await db.query('DELETE FROM student_sessions WHERE id = $1', [row.session_id]);
    return null;
  }
  if (now - row.last_seen_at.getTime() >= STUDENT_SESSION_TOUCH_MINUTES * MINUTE_MS) {
    await db.query('UPDATE student_sessions SET last_seen_at = $2 WHERE id = $1', [row.session_id, clock.now()]);
  }
  return {
    id: row.id, schoolId: row.school_id, schoolName: row.school_name, timeZone: row.time_zone, name: row.name,
    className: row.class_name, username: row.username, mustChangePassword: row.must_change_password,
  };
}

export async function revokeStudentSession(db: Queryable, token: string): Promise<void> {
  await db.query('DELETE FROM student_sessions WHERE token_hash = $1', [hashToken(token)]);
}

export function studentSessionCookie(request: Request, token: string): string {
  return sessionCookieHeader(request, STUDENT_SESSION_COOKIE, token, STUDENT_SESSION_ABSOLUTE_HOURS * 3600);
}

export function clearedStudentSessionCookie(request: Request): string {
  return sessionCookieHeader(request, STUDENT_SESSION_COOKIE, '', 0);
}
