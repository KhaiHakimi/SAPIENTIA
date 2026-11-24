import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as me } from '@/app/api/me/route';
import { DELETE as removeUser, PATCH as updateUser } from '@/app/api/users/[id]/route';
import { GET as listUsers, POST as inviteUser } from '@/app/api/users/route';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { Page } from '@/shared/interfaces/api-error.interface';
import { appClock, fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import type { StaffUser } from '../interfaces/staff-user.interface';
import { removeUser as removeUserService, updateUserStatus } from './users.service';

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

  afterEach(() => setTestClock(null));
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

  it('re-checks the acting administrator under lock, so two cannot disable each other and leave none', async () => {
    const admin2Id = await createUser(schoolA, 'admin2@a.test', 'admin');
    const admin2 = await signIn('admin2@a.test');
    const asAdmin2 = ((await (await call(me, '/api/me', { cookie: admin2 })).json()) as { user: SessionUser }).user;

    // admin2 passed the sign-in check before admin disabled them; their own change must then be refused.
    expect((await patch(admin2Id, 'disabled')).status).toBe(200);
    await expect(updateUserStatus(asAdmin2, adminId, { status: 'disabled' }, appClock())).rejects.toMatchObject({ status: 401 });
    await expect(removeUserService(asAdmin2, adminId, appClock())).rejects.toMatchObject({ status: 401 });
    expect((await call(me, '/api/me', { cookie: admin })).status).toBe(200);

    // Both at once: one wins, and the school keeps an active administrator.
    expect((await patch(admin2Id, 'active')).status).toBe(200);
    const again = await signIn('admin2@a.test');
    const results = await Promise.all([patch(admin2Id, 'disabled'), patch(adminId, 'disabled', again)]);
    expect(results.map((response) => response.status).filter((status) => status === 200)).toHaveLength(1);
    const { rows } = await getPool().query<{ count: number }>(
      "SELECT count(*)::int AS count FROM users WHERE school_id = $1 AND role = 'admin' AND status = 'active'", [schoolA],
    );
    expect(rows[0].count).toBe(1);
  });

  it('removing a login cancels the relief they were to cover from today, in the school\'s time zone', async () => {
    // 00:30 on Tuesday 24 November in Kuala Lumpur, still the 23rd in UTC.
    setTestClock(fixedClock('2026-11-23T16:30:00Z'));
    const cookie = await signIn('admin@a.test');
    const { rows: [slot] } = await getPool().query<{ id: string }>(
      `INSERT INTO timetable_slots (school_id, teacher_id, weekday, start_time, end_time, label)
       VALUES ($1, $2, 2, '08:00', '09:00', 'Bertugas') RETURNING id`,
      [schoolA, adminId],
    );
    for (const onDate of ['2026-11-23', '2026-11-24', '2026-12-01']) {
      await getPool().query(
        `INSERT INTO relief_assignments (school_id, slot_id, on_date, absent_teacher_id, relief_teacher_id, start_time, end_time,
                                         deliver_at, created_by)
         VALUES ($1, $2, $3, $4, $5, '08:00', '09:00', now(), $4)`,
        [schoolA, slot.id, onDate, adminId, guruId],
      );
    }

    expect((await remove(guruId, cookie)).status).toBe(204);
    const { rows: left } = await getPool().query<{ on_date: string }>('SELECT on_date::text AS on_date FROM relief_assignments');
    expect(left.map((row) => row.on_date)).toEqual(['2026-11-23']);
    const { rows: audit } = await getPool().query<{ action: string; metadata: { onDate?: string } }>(
      "SELECT action, metadata FROM audit_logs WHERE action IN ('relief.cancelled', 'user.removed') ORDER BY id",
    );
    expect(audit.map((row) => [row.action, row.metadata.onDate ?? null])).toEqual([
      ['relief.cancelled', '2026-11-24'], ['relief.cancelled', '2026-12-01'], ['user.removed', null],
    ]);
  });

  it('removing a login keeps relief already over today and cancels today\'s periods still to come', async () => {
    // 10:00 on Tuesday 24 November in Kuala Lumpur.
    setTestClock(fixedClock('2026-11-24T02:00:00Z'));
    const cookie = await signIn('admin@a.test');
    for (const [start, end] of [['08:00', '09:00'], ['11:00', '12:00']]) {
      const { rows: [slot] } = await getPool().query<{ id: string }>(
        `INSERT INTO timetable_slots (school_id, teacher_id, weekday, start_time, end_time, label)
         VALUES ($1, $2, 2, $3, $4, 'Bertugas') RETURNING id`,
        [schoolA, adminId, start, end],
      );
      await getPool().query(
        `INSERT INTO relief_assignments (school_id, slot_id, on_date, absent_teacher_id, relief_teacher_id, start_time, end_time,
                                         deliver_at, created_by)
         VALUES ($1, $2, '2026-11-24', $3, $4, $5, $6, now(), $3)`,
        [schoolA, slot.id, adminId, guruId, start, end],
      );
    }

    expect((await remove(guruId, cookie)).status).toBe(204);
    const { rows: left } = await getPool().query<{ start_time: string }>(
      "SELECT to_char(start_time, 'HH24:MI') AS start_time FROM relief_assignments",
    );
    expect(left.map((row) => row.start_time)).toEqual(['08:00']);
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
