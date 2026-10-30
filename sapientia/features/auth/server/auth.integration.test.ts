import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as me } from '@/app/api/me/route';
import { fixedClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import {
  call, cookieFrom, createSchool, createUser, errorCode, resetDatabase, TEST_PASSWORD,
} from '@/shared/server/testing/api-test-kit';
import { THROTTLE_MAX_PER_EMAIL } from '../constants/session.constants';
import { createSession, resolveSession } from './session.service';

const signIn = (email: string, password = TEST_PASSWORD) => call(login, '/api/auth/login', { method: 'POST', body: { email, password } });

describe('sign-in and sessions', () => {
  let schoolId: string;

  beforeEach(async () => {
    await resetDatabase();
    schoolId = await createSchool('A001');
    await createUser(schoolId, 'guru@a.test', 'teacher');
  });

  afterAll(closePool);

  it('signs in with an HttpOnly, SameSite=Lax cookie and /api/me returns the user', async () => {
    const response = await signIn('  GURU@a.test ');
    expect(response.status).toBe(204);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);

    const profile = await call(me, '/api/me', { cookie: cookieFrom(response) });
    expect(profile.status).toBe(200);
    expect((await profile.json()).user).toMatchObject({ email: 'guru@a.test', role: 'teacher', schoolId });
  });

  it('gives the same answer for a wrong password, an unknown email and an account not yet active', async () => {
    await createUser(schoolId, 'baru@a.test', 'teacher', 'invited');
    const bodies = [];
    for (const response of [await signIn('guru@a.test', 'wrong-password'), await signIn('tiada@a.test'), await signIn('baru@a.test')]) {
      expect(response.status).toBe(401);
      const { error } = await response.json();
      bodies.push({ code: error.code, message: error.message });
    }
    expect(new Set(bodies.map((body) => JSON.stringify(body))).size).toBe(1);
  });

  it('stops accepting attempts for an account after repeated failures, even with the right password', async () => {
    for (let attempt = 0; attempt < THROTTLE_MAX_PER_EMAIL; attempt++) await signIn('guru@a.test', 'wrong-password');
    const blocked = await signIn('guru@a.test');
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('ends the session on sign-out', async () => {
    const cookie = cookieFrom(await signIn('guru@a.test'));
    expect((await call(logout, '/api/auth/logout', { method: 'POST', cookie })).status).toBe(204);
    expect((await call(me, '/api/me', { cookie })).status).toBe(401);
  });

  it('refuses a cross-site write', async () => {
    const response = await call(login, '/api/auth/login', {
      method: 'POST',
      body: { email: 'guru@a.test', password: TEST_PASSWORD },
      headers: { origin: 'https://evil.example' },
    });
    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe('csrf');
  });

  it('refuses unknown fields', async () => {
    const response = await call(login, '/api/auth/login', {
      method: 'POST',
      body: { email: 'guru@a.test', password: TEST_PASSWORD, role: 'admin' },
    });
    expect(response.status).toBe(400);
  });

  it('expires a session after an hour idle and after twelve hours in any case', async () => {
    const { rows } = await getPool().query<{ id: string }>('SELECT id FROM users WHERE email = $1', ['guru@a.test']);
    const start = '2026-11-02T00:00:00Z';
    const idle = await createSession(getPool(), schoolId, rows[0].id, fixedClock(start));
    expect(await resolveSession(getPool(), idle, fixedClock('2026-11-02T00:59:00Z'))).not.toBeNull();
    expect(await resolveSession(getPool(), idle, fixedClock('2026-11-02T02:00:00Z'))).toBeNull();

    // Active every 50 minutes, but still signed out at the absolute limit.
    const busy = await createSession(getPool(), schoolId, rows[0].id, fixedClock(start));
    for (let minutes = 50; minutes < 12 * 60; minutes += 50) {
      const at = new Date(Date.parse(start) + minutes * 60_000);
      expect(await resolveSession(getPool(), busy, fixedClock(at))).not.toBeNull();
    }
    expect(await resolveSession(getPool(), busy, fixedClock('2026-11-02T12:00:00Z'))).toBeNull();
  });

  it('stores only a hash of the session token', async () => {
    const cookie = cookieFrom(await signIn('guru@a.test'));
    const token = decodeURIComponent(cookie.split('=')[1]);
    const { rows } = await getPool().query<{ token_hash: Buffer }>('SELECT token_hash FROM sessions');
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash.toString('base64url')).not.toBe(token);
  });
});
