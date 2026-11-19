import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as getSettings, PATCH as patchSettings } from '@/app/api/me/notifications/route';
import { PATCH as moveMine } from '@/app/api/tasks/[id]/assignments/me/route';
import { POST as createTask } from '@/app/api/tasks/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import type { EmailMessage, EmailSender } from '@/features/notifications/interfaces/notification.interface';
import { SendFailure } from '@/features/notifications/server/send-failure';
import type { TaskDetail } from '@/features/tasks/interfaces/task.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import { sendWeeklyDigests } from './digest.service';

const at = (local: string) => fixedClock(new Date(`${local}+08:00`));
const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

/** An email sender that keeps what it was given, and can be told to fail the next sends. */
function fakeEmail() {
  const sent: EmailMessage[] = [];
  const failNext: SendFailure[] = [];
  const sender: EmailSender = {
    send: async (message) => {
      const failure = failNext.shift();
      if (failure) throw failure;
      sent.push(message);
    },
  };
  return { sender, sent, failNext };
}

/** The weekly digest (plan Phase 6): when it goes, to whom, what it says, and that a week is never sent twice. */
describe('weekly digest', () => {
  let schoolA: string;
  let guru: string;

  const send = (local: string, email: EmailSender | null) => sendWeeklyDigests(at(local), email, 'https://sapientia.test');

  beforeEach(async () => {
    // Wednesday 18 November 2026, in working hours: tasks are delivered at once.
    setTestClock(at('2026-11-18T10:00'));
    await resetDatabase();
    schoolA = await createSchool('A001');
    await createUser(schoolA, 'pk@a.test', 'sender');
    guru = await createUser(schoolA, 'guru@a.test', 'teacher');
    await createUser(schoolA, 'guru2@a.test', 'teacher');
    const pk = await signIn('pk@a.test');
    const newTask = async (title: string, dueOn: string) => (await (await call(createTask, '/api/tasks', {
      method: 'POST', cookie: pk, body: { title, dueOn, assigneeIds: [guru] },
    })).json()) as TaskDetail;
    await newTask('Rekod PBD', '2026-11-20');
    await newTask('Laporan kokurikulum', '2026-11-26');
    await newTask('Rancangan tahunan', '2026-12-10');
    const finished = await newTask('Borang kesihatan', '2026-11-25');
    await call(moveMine, `/api/tasks/${finished.id}/assignments/me`, {
      method: 'PATCH', cookie: await signIn('guru@a.test'), body: { status: 'done' }, params: { id: finished.id },
    });
  });

  afterAll(async () => {
    setTestClock(null);
    await closeQueue();
    await closePool();
  });

  it('sends nothing before the first working morning of the week', async () => {
    const email = fakeEmail();
    expect(await send('2026-11-23T07:29', email.sender)).toEqual({ sent: 0, empty: 0, failed: 0, retry: 0 });
    expect(await send('2026-11-22T09:00', email.sender)).toEqual({ sent: 0, empty: 0, failed: 0, retry: 0 });
    expect(email.sent).toEqual([]);
  });

  it('on Monday morning sends each person their own unfinished work once, and nothing to people with nothing', async () => {
    const email = fakeEmail();
    expect(await send('2026-11-23T07:45', email.sender)).toEqual({ sent: 1, empty: 2, failed: 0, retry: 0 });
    expect(email.sent).toHaveLength(1);
    const [message] = email.sent;
    expect(message.to).toBe('guru@a.test');
    expect(message.text).toContain('Sudah lewat (1):\n- Rekod PBD');
    expect(message.text).toContain('Tarikh akhir minggu ini (1):\n- Laporan kokurikulum');
    expect(message.text).not.toMatch(/Rancangan tahunan|Borang kesihatan/);
    expect(message.text).toContain('https://sapientia.test/staff');

    // Later sweeps that day find everyone recorded for the week.
    expect(await send('2026-11-23T08:00', email.sender)).toEqual({ sent: 0, empty: 0, failed: 0, retry: 0 });
    const { rows } = await getPool().query('SELECT outcome, count(*)::int AS n FROM digest_sends GROUP BY outcome ORDER BY outcome');
    expect(rows).toEqual([{ outcome: 'sent', n: 1 }, { outcome: 'empty', n: 2 }]);
  });

  it('goes on Tuesday when Monday is a school holiday', async () => {
    await getPool().query(
      `INSERT INTO calendar_events (school_id, on_date, kind, title, created_by) VALUES ($1, '2026-11-23', 'holiday', 'Cuti', $2)`,
      [schoolA, guru],
    );
    const email = fakeEmail();
    expect((await send('2026-11-23T09:00', email.sender)).sent).toBe(0);
    expect((await send('2026-11-24T07:30', email.sender)).sent).toBe(1);
  });

  it('retries a temporary email failure at the next sweep, and records a permanent one without retrying', async () => {
    const email = fakeEmail();
    email.failNext.push(new SendFailure('temporary', 'smtp down'));
    expect(await send('2026-11-23T07:45', email.sender)).toMatchObject({ sent: 0, retry: 1 });
    expect(await send('2026-11-23T08:00', email.sender)).toMatchObject({ sent: 1, retry: 0 });

    await getPool().query('DELETE FROM digest_sends');
    email.failNext.push(new SendFailure('permanent', 'mailbox refused'));
    expect(await send('2026-11-23T08:15', email.sender)).toMatchObject({ sent: 0, failed: 1 });
    expect(await send('2026-11-23T08:30', email.sender)).toMatchObject({ sent: 0, failed: 0 });
  });

  it('is off for a person who turns it off, and does nothing without an email server', async () => {
    setTestClock(at('2026-11-23T07:00'));
    const teacher = await signIn('guru@a.test');
    expect((await (await call(getSettings, '/api/me/notifications', { cookie: teacher })).json()).weeklyDigest).toBe(true);
    const patched = await call(patchSettings, '/api/me/notifications', { method: 'PATCH', cookie: teacher, body: { weeklyDigest: false } });
    expect(await patched.json()).toMatchObject({ email: true, weeklyDigest: false });
    expect((await call(patchSettings, '/api/me/notifications', { method: 'PATCH', cookie: teacher, body: {} })).status).toBe(400);

    expect(await send('2026-11-23T07:45', null)).toEqual({ sent: 0, empty: 0, failed: 0, retry: 0 });
    const email = fakeEmail();
    expect(await send('2026-11-23T07:45', email.sender)).toEqual({ sent: 0, empty: 2, failed: 0, retry: 0 });
  });
});
