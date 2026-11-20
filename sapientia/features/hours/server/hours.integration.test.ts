import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { DELETE as deleteEntry } from '@/app/api/me/hours/[id]/route';
import { GET as getMonth, POST as addEntry } from '@/app/api/me/hours/route';
import { DELETE as withdraw, PUT as share } from '@/app/api/me/hours/share/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import type { HoursEntry, HoursMonth } from '../interfaces/hours.interface';

/** Malaysia time, Thursday 12 November 2026. */
const NOW = '2026-11-12T20:00:00+08:00';

const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

describe('private hours log (Sprint 9, G5)', () => {
  let owner: string;
  let colleague: string;
  let admin: string;
  let outsider: string;

  const add = (body: Record<string, unknown>, cookie = owner) => call(addEntry, '/api/me/hours', { method: 'POST', cookie, body });
  const month = async (value: string, cookie = owner) =>
    (await (await call(getMonth, `/api/me/hours?month=${value}`, { cookie })).json()) as HoursMonth;
  const fieldsOf = async (response: Response) => ((await response.json()) as { error: { fields?: Record<string, string> } }).error.fields;
  const remove = (id: string, cookie = owner) => call(deleteEntry, `/api/me/hours/${id}`, { method: 'DELETE', cookie, params: { id } });

  beforeEach(async () => {
    setTestClock(fixedClock(NOW));
    await resetDatabase();
    const schoolA = await createSchool('A001');
    const schoolB = await createSchool('B001');
    await createUser(schoolA, 'guru@a.test', 'teacher');
    await createUser(schoolA, 'guru2@a.test', 'teacher');
    await createUser(schoolA, 'admin@a.test', 'admin');
    await createUser(schoolB, 'admin@b.test', 'admin');
    owner = await signIn('guru@a.test');
    colleague = await signIn('guru2@a.test');
    admin = await signIn('admin@a.test');
    outsider = await signIn('admin@b.test');
  });

  afterEach(() => setTestClock(null));

  afterAll(async () => {
    await closeQueue();
    await closePool();
  });

  it('keeps my entries by month, newest first, with the month total', async () => {
    expect((await add({ onDate: '2026-11-10', minutes: 90, kind: 'marking', note: '  Kertas 2 Tingkatan 4  ' })).status).toBe(201);
    expect((await add({ onDate: '2026-11-12', minutes: 45, kind: 'preparation' })).status).toBe(201);
    expect((await add({ onDate: '2026-10-30', minutes: 60, kind: 'meetings' })).status).toBe(201);

    const november = await month('2026-11');
    expect(november.totalMinutes).toBe(135);
    expect(november.entries.map((entry) => [entry.onDate, entry.minutes, entry.kind, entry.note])).toEqual([
      ['2026-11-12', 45, 'preparation', null],
      ['2026-11-10', 90, 'marking', 'Kertas 2 Tingkatan 4'],
    ]);
    expect((await month('2026-10')).totalMinutes).toBe(60);
    expect(november.share).toBeNull();
  });

  it('refuses future dates, dates over a year back, and times outside 1 minute to 24 hours', async () => {
    expect(await fieldsOf(await add({ onDate: '2026-11-13', minutes: 30, kind: 'marking' }))).toEqual({ onDate: 'future_date' });
    expect(await fieldsOf(await add({ onDate: '2025-11-10', minutes: 30, kind: 'marking' }))).toEqual({ onDate: 'too_old' });
    expect(await fieldsOf(await add({ onDate: '2026-11-12', minutes: 0, kind: 'marking' }))).toEqual({ minutes: 'invalid_minutes' });
    expect(await fieldsOf(await add({ onDate: '2026-11-12', minutes: 1441, kind: 'marking' }))).toEqual({ minutes: 'invalid_minutes' });
    expect(await fieldsOf(await add({ onDate: '2026-11-12', minutes: 30, kind: 'gardening' }))).toEqual({ kind: 'invalid_kind' });
    // The owner comes from the session; naming someone else is not even accepted.
    expect((await add({ onDate: '2026-11-12', minutes: 30, kind: 'marking', userId: 'x' })).status).toBe(400);
  });

  it('is unreadable and undeletable by anyone but its owner, and stays out of the audit log', async () => {
    const entry = (await (await add({ onDate: '2026-11-10', minutes: 90, kind: 'marking', note: 'Kertas 2' })).json()) as HoursEntry;

    for (const cookie of [colleague, admin, outsider]) {
      const seen = await month('2026-11', cookie);
      expect(seen.entries).toEqual([]);
      expect(seen.totalMinutes).toBe(0);
      expect((await remove(entry.id, cookie)).status).toBe(404);
    }
    expect((await month('2026-11')).entries).toHaveLength(1);
    expect((await call(getMonth, '/api/me/hours?month=2026-11')).status).toBe(401);

    const { rows } = await getPool().query('SELECT action, metadata FROM audit_logs');
    expect(JSON.stringify(rows)).not.toContain(entry.id);
    expect(JSON.stringify(rows)).not.toContain('Kertas');

    expect((await remove(entry.id)).status).toBe(204);
    expect((await month('2026-11')).entries).toEqual([]);
  });

  it('shares only the month total as it was when shared, and can withdraw it', async () => {
    await add({ onDate: '2026-11-10', minutes: 90, kind: 'marking' });
    const shared = await call(share, '/api/me/hours/share', { method: 'PUT', cookie: owner, body: { month: '2026-11' } });
    expect(shared.status).toBe(200);
    expect(await shared.json()).toEqual({ minutes: 90, sharedAt: new Date(NOW).toISOString() });

    // Later entries do not move the shared figure until it is shared again.
    await add({ onDate: '2026-11-11', minutes: 30, kind: 'administration' });
    const after = await month('2026-11');
    expect([after.totalMinutes, after.share?.minutes]).toEqual([120, 90]);
    await call(share, '/api/me/hours/share', { method: 'PUT', cookie: owner, body: { month: '2026-11' } });
    expect((await month('2026-11')).share?.minutes).toBe(120);

    // A colleague's share is their own: mine is not affected, and theirs is not visible to me.
    await call(share, '/api/me/hours/share', { method: 'PUT', cookie: colleague, body: { month: '2026-11' } });
    expect((await month('2026-11', colleague)).share?.minutes).toBe(0);
    expect((await month('2026-11')).share?.minutes).toBe(120);

    const future = await call(share, '/api/me/hours/share', { method: 'PUT', cookie: owner, body: { month: '2026-12' } });
    expect(await fieldsOf(future)).toEqual({ month: 'future_month' });

    expect((await call(withdraw, '/api/me/hours/share?month=2026-11', { method: 'DELETE', cookie: owner })).status).toBe(204);
    expect((await month('2026-11')).share).toBeNull();

    // The audit log says a month was shared or withdrawn, never the figure.
    const { rows } = await getPool().query<{ action: string; metadata: Record<string, unknown> }>(
      `SELECT action, metadata FROM audit_logs WHERE action LIKE 'hours.%' ORDER BY created_at, id`,
    );
    expect(rows.every((row) => JSON.stringify(row.metadata) === JSON.stringify({ month: '2026-11' }))).toBe(true);
    expect(rows.map((row) => row.action)).toContain('hours.unshared');
  });
});
