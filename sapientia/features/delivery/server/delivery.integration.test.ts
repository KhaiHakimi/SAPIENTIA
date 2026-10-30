import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { DELETE as deleteEvent } from '@/app/api/calendar/events/[id]/route';
import { GET as listEvents, POST as addEvent } from '@/app/api/calendar/events/route';
import { GET as preview } from '@/app/api/delivery/preview/route';
import { GET as getSettings, PATCH as patchSettings } from '@/app/api/school/settings/route';
import { PATCH as moveMine } from '@/app/api/tasks/[id]/assignments/me/route';
import { POST as comment } from '@/app/api/tasks/[id]/comments/route';
import { GET as getTask } from '@/app/api/tasks/[id]/route';
import { GET as listTasks, POST as createTask } from '@/app/api/tasks/route';
import type { TaskDetail } from '@/features/tasks/interfaces/task.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import {
  call, clearQueuedJobs, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD,
} from '@/shared/server/testing/api-test-kit';
import { closeQueue } from './delivery-queue.service';
import { deliverDueTasks, deliverTask } from './delivery.service';

/** Malaysia time. 6 November 2026 is a Friday; 9 November is the Monday after. */
const myt = (local: string) => new Date(`${local}:00+08:00`);
const at = (local: string) => setTestClock(fixedClock(myt(local)));

const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

describe('held delivery (Sprint 4)', () => {
  let schoolA: string;
  let guru: string;

  const send = (cookie: string, body: Record<string, unknown>) => call(createTask, '/api/tasks', { method: 'POST', cookie, body });
  const task = (assigneeId: string, extra: Record<string, unknown> = {}) =>
    ({ title: 'Lengkapkan borang data murid', dueOn: '2026-11-20', assigneeIds: [assigneeId], ...extra });

  beforeEach(async () => {
    await resetDatabase();
    await clearQueuedJobs();
    schoolA = await createSchool('A001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    await createUser(schoolA, 'pk@a.test', 'sender');
    guru = await createUser(schoolA, 'guru@a.test', 'teacher');
  });

  afterEach(() => setTestClock(null));

  afterAll(async () => {
    await closeQueue();
    await closePool();
  });

  it('MVP: created at 10 pm Friday, invisible to the teacher until 7:30 am Monday', async () => {
    at('2026-11-06T22:00');
    const sender = await signIn('pk@a.test');
    const created = (await (await send(sender, task(guru))).json()) as TaskDetail;
    expect(created.deliveredAt).toBeNull();
    expect(created.deliverAt).toBe(myt('2026-11-09T07:30').toISOString());

    // Exactly one job, keyed by the task, due at the delivery time, saved with the task.
    const { rows: jobs } = await getPool().query<{ start_after: Date }>(
      `SELECT start_after FROM pgboss.job WHERE name = 'deliver-task' AND singleton_key = $1`, [created.id],
    );
    expect(jobs.map((job) => job.start_after.toISOString())).toEqual([created.deliverAt]);

    // Over the weekend the teacher sees nothing and can do nothing with it.
    at('2026-11-08T20:00');
    const teacher = await signIn('guru@a.test');
    const params = { id: created.id };
    const board = await (await call(listTasks, '/api/tasks?view=assigned', { cookie: teacher })).json();
    expect(board.items).toEqual([]);
    expect((await call(getTask, `/api/tasks/${created.id}`, { cookie: teacher, params })).status).toBe(404);
    expect((await call(moveMine, `/api/tasks/${created.id}/assignments/me`, { method: 'PATCH', cookie: teacher, body: { status: 'done' }, params })).status).toBe(404);
    expect((await call(comment, `/api/tasks/${created.id}/comments`, { method: 'POST', cookie: teacher, body: { body: 'x' }, params })).status).toBe(404);

    // The sender sees it in the held list.
    const held = await (await call(listTasks, '/api/tasks?view=held', { cookie: await signIn('pk@a.test') })).json();
    expect(held.items.map((item: { id: string }) => item.id)).toEqual([created.id]);

    // One minute early: nothing. At 7:30: delivered, once.
    expect(await deliverDueTasks(fixedClock(myt('2026-11-09T07:29')))).toBe(0);
    expect(await deliverTask(created.id, fixedClock(myt('2026-11-09T07:30')))).toBe(true);
    expect(await deliverTask(created.id, fixedClock(myt('2026-11-09T07:31')))).toBe(false);
    expect(await deliverDueTasks(fixedClock(myt('2026-11-09T07:32')))).toBe(0);

    at('2026-11-09T07:35');
    const monday = await signIn('guru@a.test');
    const visible = await (await call(listTasks, '/api/tasks?view=assigned', { cookie: monday })).json();
    expect(visible.items.map((item: { id: string }) => item.id)).toEqual([created.id]);

    const { rows } = await getPool().query<{ action: string; metadata: Record<string, string> }>(
      'SELECT action, metadata FROM audit_logs WHERE entity_id = $1 ORDER BY id', [created.id],
    );
    expect(rows.map((row) => row.action)).toEqual(['task.created', 'task.assigned', 'task.held', 'task.delivered']);
  });

  it('the sweep delivers a due task whose job went missing', async () => {
    at('2026-11-06T22:00');
    const created = (await (await send(await signIn('pk@a.test'), task(guru))).json()) as TaskDetail;
    await clearQueuedJobs();
    expect(await deliverDueTasks(fixedClock(myt('2026-11-09T07:31')))).toBe(1);
    const { rows } = await getPool().query<{ delivered_at: Date | null }>('SELECT delivered_at FROM tasks WHERE id = $1', [created.id]);
    expect(rows[0].delivered_at).not.toBeNull();
  });

  it('delivers at once inside working hours', async () => {
    at('2026-11-05T10:00');
    const created = (await (await send(await signIn('pk@a.test'), task(guru))).json()) as TaskDetail;
    expect(created.deliveredAt).toBe(myt('2026-11-05T10:00').toISOString());
  });

  it('urgent override: needs a reason, delivers at once and is recorded', async () => {
    at('2026-11-06T22:00');
    const sender = await signIn('pk@a.test');
    const noReason = await send(sender, task(guru, { urgent: true }));
    expect(noReason.status).toBe(400);
    expect((await noReason.json()).error.fields.urgentReason).toBe('required');

    const created = (await (await send(sender, task(guru, { urgent: true, urgentReason: 'Lawatan nazir esok pagi' }))).json()) as TaskDetail;
    expect(created).toMatchObject({ urgent: true, urgentReason: 'Lawatan nazir esok pagi' });
    expect(created.deliveredAt).toBe(myt('2026-11-06T22:00').toISOString());

    const teacher = await signIn('guru@a.test');
    expect((await call(getTask, `/api/tasks/${created.id}`, { cookie: teacher, params: { id: created.id } })).status).toBe(200);

    const { rows } = await getPool().query<{ action: string; metadata: unknown }>('SELECT action, metadata FROM audit_logs WHERE entity_id = $1 ORDER BY id', [created.id]);
    expect(rows.map((row) => row.action)).toContain('task.urgent_override');
    expect(JSON.stringify(rows)).not.toContain('nazir');

    // The database refuses an urgent task without a reason even if the code were bypassed.
    await expect(getPool().query(
      `INSERT INTO tasks (school_id, created_by, title, due_on, deliver_at, delivered_at, urgent)
       SELECT school_id, created_by, 'x', due_on, deliver_at, delivered_at, true FROM tasks WHERE id = $1`, [created.id],
    )).rejects.toThrow(/tasks_urgent_has_reason/);
  });

  it('refuses a due date before the day the task would arrive', async () => {
    at('2026-11-06T22:00');
    const response = await send(await signIn('pk@a.test'), task(guru, { dueOn: '2026-11-07' }));
    expect((await response.json()).error.fields.dueOn).toBe('due_before_delivery');
  });

  it('Friday-Saturday weekend (Kelantan, Terengganu) end to end', async () => {
    at('2026-11-05T09:00');
    const admin = await signIn('admin@a.test');
    const saved = await call(patchSettings, '/api/school/settings', { method: 'PATCH', cookie: admin, body: { weekendDays: [6, 5], stateCode: 'KTN' } });
    expect(saved.status).toBe(200);
    expect((await saved.json()).weekendDays).toEqual([5, 6]);

    at('2026-11-05T22:00');
    const thursdayNight = (await (await send(await signIn('pk@a.test'), task(guru))).json()) as TaskDetail;
    expect(thursdayNight.deliverAt).toBe(myt('2026-11-08T07:30').toISOString());

    at('2026-11-06T15:00');
    const fridayAfternoon = (await (await send(await signIn('pk@a.test'), task(guru))).json()) as TaskDetail;
    expect(fridayAfternoon.deliverAt).toBe(myt('2026-11-08T07:30').toISOString());

    at('2026-11-08T07:30');
    expect(await deliverDueTasks(fixedClock(myt('2026-11-08T07:30')))).toBe(2);
  });

  it('a holiday on the calendar moves delivery to the next working day', async () => {
    at('2026-11-05T09:00');
    const admin = await signIn('admin@a.test');
    const added = await call(addEvent, '/api/calendar/events', {
      method: 'POST', cookie: admin, body: { onDate: '2026-11-09', kind: 'holiday', title: 'Cuti peristiwa' },
    });
    expect(added.status).toBe(201);
    const duplicate = await call(addEvent, '/api/calendar/events', {
      method: 'POST', cookie: admin, body: { onDate: '2026-11-09', kind: 'working_day', title: 'Ganti' },
    });
    expect((await duplicate.json()).error.fields.onDate).toBe('date_taken');

    at('2026-11-06T22:00');
    const created = (await (await send(await signIn('pk@a.test'), task(guru))).json()) as TaskDetail;
    expect(created.deliverAt).toBe(myt('2026-11-10T07:30').toISOString());
  });

  it('previews the delivery time for the create form', async () => {
    at('2026-11-06T22:00');
    const body = await (await call(preview, '/api/delivery/preview', { cookie: await signIn('pk@a.test') })).json();
    expect(body).toEqual({ deliverAt: myt('2026-11-09T07:30').toISOString(), held: true, timeZone: 'Asia/Kuala_Lumpur' });
  });

  it('checks settings: end after start, and defaults until saved', async () => {
    at('2026-11-05T09:00');
    const admin = await signIn('admin@a.test');
    const defaults = await (await call(getSettings, '/api/school/settings', { cookie: admin })).json();
    expect(defaults).toMatchObject({ workStart: '07:30', workEnd: '17:00', weekendDays: [6, 7] });
    const bad = await call(patchSettings, '/api/school/settings', { method: 'PATCH', cookie: admin, body: { workEnd: '07:00' } });
    expect((await bad.json()).error.fields.workEnd).toBe('end_before_start');
  });

  it('refusals: teachers cannot change settings, the calendar or preview; schools cannot touch each other\'s calendar', async () => {
    at('2026-11-05T09:00');
    const teacher = await signIn('guru@a.test');
    expect((await call(patchSettings, '/api/school/settings', { method: 'PATCH', cookie: teacher, body: { workStart: '06:00' } })).status).toBe(404);
    expect((await call(addEvent, '/api/calendar/events', { method: 'POST', cookie: teacher, body: { onDate: '2026-12-01', kind: 'holiday', title: 'x' } })).status).toBe(404);
    expect((await call(preview, '/api/delivery/preview', { cookie: teacher })).status).toBe(404);

    const schoolB = await createSchool('B001');
    await createUser(schoolB, 'admin@b.test', 'admin');
    const adminB = await signIn('admin@b.test');
    const eventB = await (await call(addEvent, '/api/calendar/events', {
      method: 'POST', cookie: adminB, body: { onDate: '2026-12-01', kind: 'holiday', title: 'Cuti B' },
    })).json();

    const adminA = await signIn('admin@a.test');
    expect((await call(deleteEvent, `/api/calendar/events/${eventB.id}`, { method: 'DELETE', cookie: adminA, params: { id: eventB.id } })).status).toBe(404);
    const listA = await (await call(listEvents, '/api/calendar/events', { cookie: adminA })).json();
    expect(listA.items).toEqual([]);
    const settingsB = await (await call(getSettings, '/api/school/settings', { cookie: adminB })).json();
    await call(patchSettings, '/api/school/settings', { method: 'PATCH', cookie: adminA, body: { workStart: '08:00' } });
    expect((await (await call(getSettings, '/api/school/settings', { cookie: adminB })).json()).workStart).toBe(settingsB.workStart);
  });
});
