import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as getSettings, PATCH as patchSettings } from '@/app/api/me/notifications/route';
import { DELETE as unsubscribe, POST as subscribe } from '@/app/api/me/push-subscriptions/route';
import { POST as createTask } from '@/app/api/tasks/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import { deliverTask } from '@/features/delivery/server/delivery.service';
import type { TaskDetail } from '@/features/tasks/interfaces/task.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import {
  call, clearQueuedJobs, cookieFrom, createSchool, createUser, errorCode, resetDatabase, TEST_PASSWORD,
} from '@/shared/server/testing/api-test-kit';
import type { EmailMessage, NotificationSenders, PushPayload, PushSubscriptionInput } from '../interfaces/notification.interface';
import { notifyTaskDelivered } from './notify-task.service';
import { SendFailure } from './send-failure';

/** Malaysia time. 6 November 2026 is a Friday; 9 November is the Monday after. */
const myt = (local: string) => new Date(`${local}:00+08:00`);
const at = (local: string) => setTestClock(fixedClock(myt(local)));

const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

const device = (id: string): PushSubscriptionInput => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
  keys: { p256dh: `BKey${id}`, auth: `auth${id}` },
});

/** Records what would have been sent; a test can make the next sends fail. */
function fakeSenders() {
  const emails: EmailMessage[] = [];
  const pushes: { endpoint: string; payload: PushPayload }[] = [];
  const failNext: { email: SendFailure[]; push: SendFailure[] } = { email: [], push: [] };
  const senders: NotificationSenders = {
    email: {
      async send(message) {
        const failure = failNext.email.shift();
        if (failure) throw failure;
        emails.push(message);
      },
    },
    push: {
      async send(subscription, payload) {
        const failure = failNext.push.shift();
        if (failure) throw failure;
        pushes.push({ endpoint: subscription.endpoint, payload });
      },
    },
  };
  return { senders, emails, pushes, failNext };
}

const notifyJobs = async (taskId: string) =>
  (await getPool().query(`SELECT 1 FROM pgboss.job WHERE name = 'notify-task-delivered' AND singleton_key = $1`, [taskId])).rowCount;

describe('notifications (Sprint 5)', () => {
  let schoolA: string;
  let guru: string;
  let guru2: string;

  const send = async (cookie: string, assigneeIds: string[], extra: Record<string, unknown> = {}) =>
    (await (await call(createTask, '/api/tasks', {
      method: 'POST', cookie, body: { title: 'Lengkapkan borang data murid', dueOn: '2026-11-20', assigneeIds, ...extra },
    })).json()) as TaskDetail;

  beforeEach(async () => {
    await resetDatabase();
    await clearQueuedJobs();
    schoolA = await createSchool('A001');
    await createUser(schoolA, 'pk@a.test', 'sender');
    guru = await createUser(schoolA, 'guru@a.test', 'teacher');
    guru2 = await createUser(schoolA, 'guru2@a.test', 'teacher');
  });

  afterEach(() => setTestClock(null));

  afterAll(async () => {
    await closeQueue();
    await closePool();
  });

  it('queues no notice for a held task until the worker delivers it, then exactly one', async () => {
    at('2026-11-06T22:00');
    const task = await send(await signIn('pk@a.test'), [guru]);
    expect(task.deliveredAt).toBeNull();
    expect(await notifyJobs(task.id)).toBe(0);

    // Even if a notice job ran early, a held task has nothing to announce.
    const early = fakeSenders();
    expect(await notifyTaskDelivered(task.id, fixedClock(myt('2026-11-07T10:00')), early.senders, null)).toEqual({ sent: 0, failed: 0 });
    expect(early.emails).toEqual([]);

    expect(await deliverTask(task.id, fixedClock(myt('2026-11-09T07:30')))).toBe(true);
    expect(await notifyJobs(task.id)).toBe(1);
    // A repeated delivery job changes nothing and queues nothing more.
    expect(await deliverTask(task.id, fixedClock(myt('2026-11-09T07:31')))).toBe(false);
    expect(await notifyJobs(task.id)).toBe(1);
  });

  it('queues the notice at once for a task sent inside working hours', async () => {
    at('2026-11-09T10:00');
    const task = await send(await signIn('pk@a.test'), [guru]);
    expect(task.deliveredAt).not.toBeNull();
    expect(await notifyJobs(task.id)).toBe(1);
  });

  it('emails each assignee and pushes to each of their devices, once, honouring the email switch', async () => {
    at('2026-11-09T10:00');
    const teacher = await signIn('guru@a.test');
    expect((await call(subscribe, '/api/me/push-subscriptions', { method: 'POST', cookie: teacher, body: device('phone') })).status).toBe(204);
    expect((await call(subscribe, '/api/me/push-subscriptions', { method: 'POST', cookie: teacher, body: device('laptop') })).status).toBe(204);
    const teacher2 = await signIn('guru2@a.test');
    expect((await call(patchSettings, '/api/me/notifications', { method: 'PATCH', cookie: teacher2, body: { email: false } })).status).toBe(200);

    const task = await send(await signIn('pk@a.test'), [guru, guru2]);
    const fake = fakeSenders();
    const result = await notifyTaskDelivered(task.id, fixedClock(myt('2026-11-09T10:01')), fake.senders, 'https://sapientia.test');

    expect(result).toEqual({ sent: 3, failed: 0 });
    expect(fake.emails.map((email) => email.to)).toEqual(['guru@a.test']);
    expect(fake.emails[0].text).toContain(`https://sapientia.test/staff/tasks/${task.id}`);
    expect(fake.pushes.map((push) => push.endpoint).sort()).toEqual([device('laptop').endpoint, device('phone').endpoint]);
    expect(fake.pushes[0].payload.url).toBe(`/staff/tasks/${task.id}`);

    // Running the job again sends nothing new.
    const again = fakeSenders();
    expect(await notifyTaskDelivered(task.id, fixedClock(myt('2026-11-09T10:02')), again.senders, null)).toEqual({ sent: 0, failed: 0 });
    expect(again.emails).toEqual([]);
    expect(again.pushes).toEqual([]);
  });

  it('on a temporary failure, reports it so the job retries, and the retry sends only what was missing', async () => {
    at('2026-11-09T10:00');
    const task = await send(await signIn('pk@a.test'), [guru, guru2]);
    const first = fakeSenders();
    first.failNext.email.push(new SendFailure('temporary', 'email: ECONNECTION'));
    expect(await notifyTaskDelivered(task.id, fixedClock(myt('2026-11-09T10:01')), first.senders, null)).toEqual({ sent: 1, failed: 1 });
    // Whoever came first failed; which one depends on the generated ids.
    const reached = first.emails.map((email) => email.to);
    const missed = ['guru2@a.test', 'guru@a.test'].filter((address) => !reached.includes(address));
    expect(missed).toHaveLength(1);

    const retry = fakeSenders();
    expect(await notifyTaskDelivered(task.id, fixedClock(myt('2026-11-09T10:05')), retry.senders, null)).toEqual({ sent: 1, failed: 0 });
    expect(retry.emails.map((email) => email.to)).toEqual(missed);
  });

  it('forgets a device whose subscription the push service says is gone, without retrying', async () => {
    at('2026-11-09T10:00');
    const teacher = await signIn('guru@a.test');
    await call(subscribe, '/api/me/push-subscriptions', { method: 'POST', cookie: teacher, body: device('old-phone') });
    await call(patchSettings, '/api/me/notifications', { method: 'PATCH', cookie: teacher, body: { email: false } });
    const task = await send(await signIn('pk@a.test'), [guru]);

    const fake = fakeSenders();
    fake.failNext.push.push(new SendFailure('gone', 'push: subscription gone (410)', 410));
    expect(await notifyTaskDelivered(task.id, fixedClock(myt('2026-11-09T10:01')), fake.senders, null)).toEqual({ sent: 0, failed: 0 });
    const { rowCount } = await getPool().query('SELECT 1 FROM push_subscriptions');
    expect(rowCount).toBe(0);
  });

  it('sends nothing to a disabled account', async () => {
    at('2026-11-09T10:00');
    const task = await send(await signIn('pk@a.test'), [guru]);
    await getPool().query(`UPDATE users SET status = 'disabled' WHERE id = $1`, [guru]);
    const fake = fakeSenders();
    expect(await notifyTaskDelivered(task.id, fixedClock(myt('2026-11-09T10:01')), fake.senders, null)).toEqual({ sent: 0, failed: 0 });
  });

  describe('settings API', () => {
    it('shows and changes only my own email choice', async () => {
      at('2026-11-09T10:00');
      const teacher = await signIn('guru@a.test');
      const before = await (await call(getSettings, '/api/me/notifications', { cookie: teacher })).json();
      expect(before.email).toBe(true);
      await call(patchSettings, '/api/me/notifications', { method: 'PATCH', cookie: teacher, body: { email: false } });
      const { rows } = await getPool().query<{ email: string; notify_by_email: boolean }>('SELECT email, notify_by_email FROM users ORDER BY email');
      expect(rows).toEqual([
        { email: 'guru2@a.test', notify_by_email: true },
        { email: 'guru@a.test', notify_by_email: false },
        { email: 'pk@a.test', notify_by_email: true },
      ]);
    });

    it('refuses a push endpoint that is not a known push service (no server-side request forgery)', async () => {
      at('2026-11-09T10:00');
      const teacher = await signIn('guru@a.test');
      for (const endpoint of ['http://169.254.169.254/latest', 'https://localhost:3000/x', 'https://evil.test/push']) {
        const response = await call(subscribe, '/api/me/push-subscriptions', {
          method: 'POST', cookie: teacher, body: { endpoint, keys: { p256dh: 'abc', auth: 'def' } },
        });
        expect(response.status).toBe(400);
        expect(await errorCode(response)).toBe('validation');
      }
    });

    it('lets me remove my own device but not someone else\'s', async () => {
      at('2026-11-09T10:00');
      const teacher = await signIn('guru@a.test');
      const teacher2 = await signIn('guru2@a.test');
      await call(subscribe, '/api/me/push-subscriptions', { method: 'POST', cookie: teacher, body: device('phone') });
      await call(unsubscribe, '/api/me/push-subscriptions', { method: 'DELETE', cookie: teacher2, body: { endpoint: device('phone').endpoint } });
      expect((await getPool().query('SELECT 1 FROM push_subscriptions')).rowCount).toBe(1);
      await call(unsubscribe, '/api/me/push-subscriptions', { method: 'DELETE', cookie: teacher, body: { endpoint: device('phone').endpoint } });
      expect((await getPool().query('SELECT 1 FROM push_subscriptions')).rowCount).toBe(0);
    });

    it('needs a signed-in user', async () => {
      expect((await call(getSettings, '/api/me/notifications')).status).toBe(401);
      expect((await call(subscribe, '/api/me/push-subscriptions', { method: 'POST', body: device('x') })).status).toBe(401);
    });
  });
});
