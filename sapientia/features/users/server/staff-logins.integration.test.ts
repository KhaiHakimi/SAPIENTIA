import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as me } from '@/app/api/me/route';
import { DELETE as removeUser, PATCH as updateUser } from '@/app/api/users/[id]/route';
import { GET as listUsers, POST as inviteUser } from '@/app/api/users/route';
import type { Page } from '@/shared/interfaces/api-error.interface';
import { closePool, getPool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import type { StaffUser } from '../interfaces/staff-user.interface';

const signInResponse = (email: string) => call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } });
const signIn = async (email: string) => cookieFrom(await signInResponse(email));

/** Staff logins beneath the school (plan Phase 4, Sprint 14): disable, enable again, and remove for good. */
describe('staff logins (Sprint 14)', () => {
  let schoolA: string;
  let guruId: string;
  let adminId: string;
  let admin: string;

  const patch = (id: string, status: string, cookie = admin) =>
    call(updateUser, `/api/users/${id}`, { params: { id }, method: 'PATCH', cookie, body: { status } });
  const remove = (id: string, cookie = admin) => call(removeUser, `/api/users/${id}`, { params: { id }, method: 'DELETE', cookie });
  const fields = async (response: Response) => ((await response.json()) as { error: { fields: Record<string, string> } }).error.fields;

  beforeEach(async () => {
    await resetDatabase();
    schoolA = await createSchool('A001');
    const schoolB = await createSchool('B001');
    adminId = await createUser(schoolA, 'admin@a.test', 'admin');
    guruId = await createUser(schoolA, 'guru@a.test', 'teacher');
    await createUser(schoolB, 'admin@b.test', 'admin');
    admin = await signIn('admin@a.test');
  });

  afterAll(closePool);

  it('disabling signs the person out at once and stops sign-in; enabling lets them back', async () => {
    const guru = await signIn('guru@a.test');
    const disabled = await patch(guruId, 'disabled');
    expect(disabled.status).toBe(200);
    expect(((await disabled.json()) as StaffUser)).toMatchObject({ id: guruId, status: 'disabled', removed: false });
    expect((await call(me, '/api/me', { cookie: guru })).status).toBe(401);
    expect((await signInResponse('guru@a.test')).status).toBe(401);

    expect(((await (await patch(guruId, 'active')).json()) as StaffUser).status).toBe('active');
    expect((await signInResponse('guru@a.test')).status).toBe(204);

    const { rows } = await getPool().query("SELECT action FROM audit_logs WHERE entity_type = 'user' ORDER BY id");
    expect(rows.map((row) => row.action)).toEqual(['user.disabled', 'user.enabled']);
  });

  it('removing ends access for good, keeps the name as former staff, frees the email and deletes private hours', async () => {
    const guru = await signIn('guru@a.test');
    await getPool().query(
      "INSERT INTO private_hours_log (school_id, user_id, on_date, minutes, kind) VALUES ($1, $2, '2026-11-02', 60, 'marking')",
      [schoolA, guruId],
    );
    await getPool().query(
      "INSERT INTO push_subscriptions (school_id, user_id, endpoint, p256dh, auth) VALUES ($1, $2, 'https://push.test/1', 'key', 'auth')",
      [schoolA, guruId],
    );

    expect((await remove(guruId)).status).toBe(204);
    expect((await call(me, '/api/me', { cookie: guru })).status).toBe(401);
    expect((await signInResponse('guru@a.test')).status).toBe(401);

    const page = (await (await call(listUsers, '/api/users', { cookie: admin })).json()) as Page<StaffUser>;
    const former = page.items.find((item) => item.id === guruId);
    expect(former).toMatchObject({ name: 'guru', status: 'disabled', removed: true, lastSignInAt: null });
    expect(former?.email).not.toContain('guru@a.test');
    const { rows } = await getPool().query<{ hours: number; devices: number; hash: string | null }>(
      `SELECT (SELECT count(*)::int FROM private_hours_log WHERE user_id = $1) AS hours,
              (SELECT count(*)::int FROM push_subscriptions WHERE user_id = $1) AS devices,
              (SELECT password_hash FROM users WHERE id = $1) AS hash`,
      [guruId],
    );
    expect(rows[0]).toEqual({ hours: 0, devices: 0, hash: null });

    // Gone for good: it cannot be enabled or removed again, but the address can be invited afresh as a new account.
    expect((await patch(guruId, 'active')).status).toBe(404);
    expect((await remove(guruId)).status).toBe(404);
    const invited = await call(inviteUser, '/api/users', {
      method: 'POST', cookie: admin, body: { email: 'guru@a.test', name: 'Guru Kembali', role: 'teacher' },
    });
    expect(invited.status).toBe(201);
  });

  it('refuses an administrator\'s own login, anyone but an administrator, and another school', async () => {
    const own = await remove(adminId);
    expect(own.status).toBe(409);
    expect(await fields(own)).toEqual({ status: 'self' });
    expect(await fields(await patch(adminId, 'disabled'))).toEqual({ status: 'self' });

    expect((await patch(guruId, 'disabled', await signIn('guru@a.test'))).status).toBe(404);
    expect((await remove(guruId, await signIn('admin@b.test'))).status).toBe(404);
    expect((await patch(guruId, 'removed')).status).toBe(400);
  });
});
