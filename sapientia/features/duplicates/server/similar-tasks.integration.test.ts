import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { PATCH as moveMine } from '@/app/api/tasks/[id]/assignments/me/route';
import { POST as createTask } from '@/app/api/tasks/route';
import { POST as similar } from '@/app/api/tasks/similar/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import type { TaskDetail } from '@/features/tasks/interfaces/task.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import type { SimilarTasksResult } from '../interfaces/similar-task.interface';

/** A Wednesday morning in working hours, so the tasks here are delivered at once. */
const WORKING_HOURS = '2026-11-04T10:00:00+08:00';
const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

/** Duplicate detection (plan Phase 6): which open tasks a sender is shown, and to whom. */
describe('similar tasks', () => {
  let guru1: string;
  let guru2: string;
  let guru3: string;
  let pkA: string;
  let pkB: string;
  let task: TaskDetail;

  const check = async (cookie: string, title: string, assigneeIds: string[] = []) => {
    const response = await call(similar, '/api/tasks/similar', { method: 'POST', cookie, body: { title, assigneeIds } });
    return { status: response.status, body: response.status === 200 ? (await response.json()) as SimilarTasksResult : null };
  };

  beforeEach(async () => {
    setTestClock(fixedClock(WORKING_HOURS));
    await resetDatabase();
    const schoolA = await createSchool('A001');
    const schoolB = await createSchool('B001');
    await createUser(schoolA, 'pka@a.test', 'sender');
    await createUser(schoolA, 'pkb@a.test', 'sender');
    guru1 = await createUser(schoolA, 'guru1@a.test', 'teacher');
    guru2 = await createUser(schoolA, 'guru2@a.test', 'teacher');
    guru3 = await createUser(schoolA, 'guru3@a.test', 'teacher');
    await createUser(schoolB, 'pk@b.test', 'sender');
    pkA = await signIn('pka@a.test');
    pkB = await signIn('pkb@a.test');
    const created = await call(createTask, '/api/tasks', {
      method: 'POST', cookie: pkA, body: { title: 'Hantar markah PBD Tahun 4', dueOn: '2026-11-20', assigneeIds: [guru1, guru2] },
    });
    task = (await created.json()) as TaskDetail;
  });

  afterAll(async () => {
    setTestClock(null);
    await closeQueue();
    await closePool();
  });

  it('shows another sender the task when they choose someone who already has it, without a link', async () => {
    expect(await check(pkB, 'Sila hantar markah PBD tahun 4', [guru1, guru3])).toEqual({
      status: 200,
      body: { items: [{ taskId: null, title: 'Hantar markah PBD Tahun 4', dueOn: '2026-11-20', sentBy: { name: 'pka', isMe: false }, sharedAssignees: 1 }] },
    });
  });

  it('shows nothing about tasks unrelated to the people chosen, or with a different title', async () => {
    expect((await check(pkB, 'Hantar markah PBD Tahun 4', [guru3])).body?.items).toEqual([]);
    expect((await check(pkB, 'Hantar markah PBD Tahun 4')).body?.items).toEqual([]);
    expect((await check(pkA, 'Mesyuarat panitia Sains', [guru1])).body?.items).toEqual([]);
  });

  it('shows the sender their own task with a link, until everyone has finished it', async () => {
    expect((await check(pkA, 'hantar markah pbd')).body?.items).toMatchObject([{ taskId: task.id, sentBy: { isMe: true }, sharedAssignees: 0 }]);
    for (const email of ['guru1@a.test', 'guru2@a.test']) {
      const cookie = await signIn(email);
      await call(moveMine, `/api/tasks/${task.id}/assignments/me`, { method: 'PATCH', cookie, body: { status: 'done' }, params: { id: task.id } });
    }
    expect((await check(pkA, 'hantar markah pbd')).body?.items).toEqual([]);
  });

  it('never crosses schools, ignores tasks older than 30 days, and refuses teachers', async () => {
    expect((await check(await signIn('pk@b.test'), 'Hantar markah PBD Tahun 4')).body?.items).toEqual([]);
    setTestClock(fixedClock('2026-12-05T10:00:00+08:00'));
    expect((await check(await signIn('pka@a.test'), 'Hantar markah PBD Tahun 4')).body?.items).toEqual([]);
    setTestClock(fixedClock(WORKING_HOURS));
    expect((await check(await signIn('guru1@a.test'), 'Hantar markah PBD')).status).toBe(404);
  });
});
