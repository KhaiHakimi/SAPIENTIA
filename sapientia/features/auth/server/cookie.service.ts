import 'server-only';

/**
 * A session cookie: HttpOnly so scripts cannot read it, SameSite=Lax against cross-site posts, Secure whenever the site is
 * served over HTTPS. Staff and pupil sessions use different names. A max age of 0 clears it.
 */
export function sessionCookieHeader(request: Request, name: string, value: string, maxAgeSeconds: number): string {
  const secure = new URL(request.url).protocol === 'https:' || process.env.NODE_ENV === 'production';
  return [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
