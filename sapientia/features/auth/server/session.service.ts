import 'server-only';
import type { Clock } from '@/shared/interfaces/clock.interface';
import type { Queryable } from '@/shared/server/database.service';
import {
  SESSION_ABSOLUTE_HOURS,
  SESSION_COOKIE,
  SESSION_IDLE_MINUTES,
  SESSION_TOUCH_MINUTES,
} from '../constants/session.constants';
import type { SessionUser } from '../interfaces/session-user.interface';
import { generateToken, hashToken } from './token.service';

const MINUTE_MS = 60_000;

interface SessionRow {
  session_id: string;
  last_seen_at: Date;
  expires_at: Date;
  id: string;
  school_id: string;
  school_name: string;
  email: string;
  name: string;
  role: SessionUser['role'];
}

/** Starts a session for an active user and returns the raw token for the cookie; only its hash is stored. */
export async function createSession(db: Queryable, schoolId: string, userId: string, clock: Clock): Promise<string> {
  const token = generateToken();
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_HOURS * 60 * MINUTE_MS);
  await db.query(
    `INSERT INTO sessions (token_hash, school_id, user_id, created_at, last_seen_at, expires_at) VALUES ($1, $2, $3, $4, $4, $5)`,
    [hashToken(token), schoolId, userId, now, expiresAt],
  );
  return token;
}

/**
 * The user behind a session token, or null when the token is unknown, idle too long, past its absolute limit, or the
 * account is no longer active. Expired sessions are deleted as they are found.
 */
export async function resolveSession(db: Queryable, token: string, clock: Clock): Promise<SessionUser | null> {
  const { rows } = await db.query<SessionRow>(
    `SELECT s.id AS session_id, s.last_seen_at, s.expires_at, u.id, u.school_id, sc.name AS school_name, u.email, u.name, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id AND u.school_id = s.school_id
       JOIN schools sc ON sc.id = u.school_id
      WHERE s.token_hash = $1 AND u.status = 'active'`,
    [hashToken(token)],
  );
  const row = rows[0];
  if (!row) return null;

  const now = clock.now().getTime();
  const idleLimit = row.last_seen_at.getTime() + SESSION_IDLE_MINUTES * MINUTE_MS;
  if (now >= row.expires_at.getTime() || now >= idleLimit) {
    await db.query('DELETE FROM sessions WHERE id = $1', [row.session_id]);
    return null;
  }
  if (now - row.last_seen_at.getTime() >= SESSION_TOUCH_MINUTES * MINUTE_MS) {
    await db.query('UPDATE sessions SET last_seen_at = $2 WHERE id = $1', [row.session_id, clock.now()]);
  }
  return { id: row.id, schoolId: row.school_id, schoolName: row.school_name, email: row.email, name: row.name, role: row.role };
}

export async function revokeSession(db: Queryable, token: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

/** Signs a user out everywhere (password set, account disabled). */
export async function revokeUserSessions(db: Queryable, schoolId: string, userId: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE school_id = $1 AND user_id = $2', [schoolId, userId]);
}

/** HttpOnly so scripts cannot read it, SameSite=Lax against cross-site posts, Secure whenever the site is served over HTTPS. */
export function sessionCookie(request: Request, token: string): string {
  return cookie(request, token, SESSION_ABSOLUTE_HOURS * 3600);
}

export function clearedSessionCookie(request: Request): string {
  return cookie(request, '', 0);
}

function cookie(request: Request, value: string, maxAgeSeconds: number): string {
  const secure = new URL(request.url).protocol === 'https:' || process.env.NODE_ENV === 'production';
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
