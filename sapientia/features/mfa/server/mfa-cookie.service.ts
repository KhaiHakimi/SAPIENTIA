import 'server-only';
import { sessionCookieHeader } from '@/features/auth/server/cookie.service';
import { MFA_CHALLENGE_COOKIE, MFA_CHALLENGE_MINUTES } from '../constants/mfa.constants';

/** The code step's cookie: HttpOnly like a session, and gone after five minutes. */
export function challengeCookie(request: Request, token: string): string {
  return sessionCookieHeader(request, MFA_CHALLENGE_COOKIE, token, MFA_CHALLENGE_MINUTES * 60);
}

export function clearedChallengeCookie(request: Request): string {
  return sessionCookieHeader(request, MFA_CHALLENGE_COOKIE, '', 0);
}
