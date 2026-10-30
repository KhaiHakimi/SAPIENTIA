import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { PATCH as moveMine } from '@/app/api/tasks/[id]/assignments/me/route';
import { POST as comment } from '@/app/api/tasks/[id]/comments/route';
import { GET as getTask } from '@/app/api/tasks/[id]/route';
import { GET as listTasks, POST as createTask } from '@/app/api/tasks/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import type { AssignedTask, SentTask, TaskDetail } from '../interfaces/task.interface';

const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

const FAR_FUTURE = '2099-12-31';
/** A Wednesday morning, inside working hours, so every task here is delivered at once (held delivery has its own tests). */
const WORKING_HOURS = '2026-11-04T10:00:00+08:00';

describe('tasks (G3) and refusals', () => {
  let schoolA: string;
  let schoolB: string;
  let guruA: string;
  let guruA2: string;
  let guruB: string;
  let sender: string;

  const newTask = (cookie: string, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
    call(createTask, '/api/tasks', { method: 'POST', cookie, body, headers });

  beforeEach(async () => {
    setTestClock(fixedClock(WORKING_HOURS));
    await resetDatabase();
    schoolA = await createSchool('A001');
    schoolB = await createSchool('B001');
    await createUser(schoolA, 'pk@a.test', 'sender');
    guruA = await createUser(schoolA, 'guru@a.test', 'teacher');
    guruA2 = await createUser(schoolA, 'guru2@a.test', 'teacher');
    await createUser(schoolB, 'pk@b.test', 'sender');
    guruB = await createUser(schoolB, 'guru@b.test', 'teacher');
    sender = await signIn('pk@a.test');
  });

  afterAll(async () => {
    setTestClock(null);
    await closeQueue();
    await closePool();
  });

  it('G3: a task moves from to do to done and every step is in the audit log', async () => {
    const created = await newTask(sender, { title: 'Hantar markah PPT', dueOn: FAR_FUTURE, assigneeIds: [guruA] });
    expect(created.status).toBe(201);
    const task = (await created.json()) as TaskDetail;
    expect(task).toMatchObject({ isSender: true, assigneeCount: 1, doneCount: 0 });

    const teacher = await signIn('guru@a.test');
    const board = (await (await call(listTasks, '/api/tasks?view=assigned&status=todo', { cookie: teacher })).json()) as { items: AssignedTask[] };
    expect(board.items.map((item) => item.id)).toEqual([task.id]);

    for (const status of ['in_progress', 'waiting', 'done']) {
      const moved = await call(moveMine, `/api/tasks/${task.id}/assignments/me`, { method: 'PATCH', cookie: teacher, body: { status }, params: { id: task.id } });
      expect(moved.status).toBe(200);
    }
    const posted = await call(comment, `/api/tasks/${task.id}/comments`, { method: 'POST', cookie: teacher, body: { body: 'Sudah dihantar.' }, params: { id: task.id } });
    expect(posted.status).toBe(201);

    const { rows } = await getPool().query<{ action: string; metadata: Record<string, string> }>(
      'SELECT action, metadata FROM audit_logs WHERE entity_id = $1 ORDER BY id', [task.id],
    );
    expect(rows.map((row) => row.action)).toEqual([
      'task.created', 'task.assigned', 'task.delivered',
      'assignment.status_changed', 'assignment.status_changed', 'assignment.status_changed', 'comment.added',
    ]);
    expect(rows.slice(3, 6).map((row) => `${row.metadata.from}>${row.metadata.to}`)).toEqual(['todo>in_progress', 'in_progress>waiting', 'waiting>done']);
    // The log never holds the comment text.
    expect(JSON.stringify(rows)).not.toContain('Sudah dihantar');

    const detail = (await (await call(getTask, `/api/tasks/${task.id}`, { cookie: sender, params: { id: task.id } })).json()) as TaskDetail;
    expect(detail.doneCount).toBe(1);
    expect(detail.activity).toHaveLength(7);
    expect(detail.comments.map((item) => item.body)).toEqual(['Sudah dihantar.']);
  });

  it('refusal: a non-assignee gets 404 on a task, its comments and its assignment', async () => {
    const task = (await (await newTask(sender, { title: 'Rahsia', dueOn: FAR_FUTURE, assigneeIds: [guruA] })).json()) as TaskDetail;
    const outsider = await signIn('guru2@a.test');
    const params = { id: task.id };
    expect((await call(getTask, `/api/tasks/${task.id}`, { cookie: outsider, params })).status).toBe(404);
    expect((await call(comment, `/api/tasks/${task.id}/comments`, { method: 'POST', cookie: outsider, body: { body: 'x' }, params })).status).toBe(404);
    expect((await call(moveMine, `/api/tasks/${task.id}/assignments/me`, { method: 'PATCH', cookie: outsider, body: { status: 'done' }, params })).status).toBe(404);
  });

  it('refusal: a teacher cannot update another teacher\'s assignment', async () => {
    const task = (await (await newTask(sender, { title: 'Dua guru', dueOn: FAR_FUTURE, assigneeIds: [guruA, guruA2] })).json()) as TaskDetail;
    const second = await signIn('guru2@a.test');
    await call(moveMine, `/api/tasks/${task.id}/assignments/me`, { method: 'PATCH', cookie: second, body: { status: 'done' }, params: { id: task.id } });
    const { rows } = await getPool().query<{ user_id: string; status: string }>('SELECT user_id, status FROM task_assignments WHERE task_id = $1', [task.id]);
    expect(Object.fromEntries(rows.map((row) => [row.user_id, row.status]))).toEqual({ [guruA]: 'todo', [guruA2]: 'done' });

    // An assignee sees their own status and the count, never colleagues' progress or the activity log.
    const first = await signIn('guru@a.test');
    const view = (await (await call(getTask, `/api/tasks/${task.id}`, { cookie: first, params: { id: task.id } })).json()) as TaskDetail;
    expect(view).toMatchObject({ myStatus: 'todo', doneCount: 1, assigneeCount: 2, assignees: null, activity: null });
  });

  it('refusal: the sender cannot move an assignee\'s card', async () => {
    const task = (await (await newTask(sender, { title: 'Bukan kad saya', dueOn: FAR_FUTURE, assigneeIds: [guruA] })).json()) as TaskDetail;
    const response = await call(moveMine, `/api/tasks/${task.id}/assignments/me`, { method: 'PATCH', cookie: sender, body: { status: 'done' }, params: { id: task.id } });
    expect(response.status).toBe(404);
  });

  it('refusal: school A cannot assign school B staff or read school B tasks', async () => {
    const crossAssign = await newTask(sender, { title: 'Silang', dueOn: FAR_FUTURE, assigneeIds: [guruB] });
    expect(crossAssign.status).toBe(400);
    expect((await crossAssign.json()).error.fields.assigneeIds).toBe('invalid_assignee');

    const senderB = await signIn('pk@b.test');
    const taskB = (await (await newTask(senderB, { title: 'Sekolah B', dueOn: FAR_FUTURE, assigneeIds: [guruB] })).json()) as TaskDetail;
    expect((await call(getTask, `/api/tasks/${taskB.id}`, { cookie: sender, params: { id: taskB.id } })).status).toBe(404);
  });

  it('refusal: a teacher cannot create tasks', async () => {
    const teacher = await signIn('guru@a.test');
    expect((await newTask(teacher, { title: 'x', dueOn: FAR_FUTURE, assigneeIds: [guruA2] })).status).toBe(404);
  });

  it('refuses a due date in the past and a malformed task id', async () => {
    const past = await newTask(sender, { title: 'Lewat', dueOn: '2020-01-01', assigneeIds: [guruA] });
    expect((await past.json()).error.fields.dueOn).toBe('past_date');
    expect((await call(getTask, '/api/tasks/not-a-uuid', { cookie: sender, params: { id: 'not-a-uuid' } })).status).toBe(404);
  });

  it('replays a retried POST with the same Idempotency-Key instead of creating a second task', async () => {
    const body = { title: 'Sekali sahaja', dueOn: FAR_FUTURE, assigneeIds: [guruA] };
    const headers = { 'idempotency-key': 'f1f5c3a2-9d0b-4c1e-8e57-0b6a2b1f2c3d' };
    const [first, second] = await Promise.all([newTask(sender, body, headers), newTask(sender, body, headers)]);
    expect([first.status, second.status]).toEqual([201, 201]);
    expect((await first.json()).id).toBe((await second.json()).id);
    const { rows } = await getPool().query<{ count: number }>('SELECT count(*)::int AS count FROM tasks');
    expect(rows[0].count).toBe(1);

    const reused = await newTask(sender, { ...body, title: 'Lain' }, headers);
    expect(reused.status).toBe(409);
  });

  it('keeps the audit log append-only in the database', async () => {
    await newTask(sender, { title: 'Jejak', dueOn: FAR_FUTURE, assigneeIds: [guruA] });
    await expect(getPool().query(`UPDATE audit_logs SET action = 'x'`)).rejects.toThrow(/append-only/);
    await expect(getPool().query('DELETE FROM audit_logs')).rejects.toThrow(/append-only/);
  });

  it('pages the sent list (newest first) and the board (soonest due first)', async () => {
    for (let day = 1; day <= 5; day++) {
      // A minute apart, so "newest first" has a real order to follow.
      setTestClock(fixedClock(new Date(Date.parse(WORKING_HOURS) + day * 60_000)));
      await newTask(sender, { title: `Tugas ${day}`, dueOn: `2099-01-0${day}`, assigneeIds: [guruA] });
    }
    const collect = async <T extends { id: string }>(cookie: string, query: string) => {
      const items: T[] = [];
      let cursor: string | null = null;
      do {
        const url: string = `/api/tasks?${query}&limit=2${cursor ? `&cursor=${cursor}` : ''}`;
        const page = (await (await call(listTasks, url, { cookie })).json()) as { items: T[]; nextCursor: string | null };
        items.push(...page.items);
        cursor = page.nextCursor;
      } while (cursor);
      return items;
    };
    const sent = await collect<SentTask>(sender, 'view=sent');
    expect(sent.map((task) => task.title)).toEqual(['Tugas 5', 'Tugas 4', 'Tugas 3', 'Tugas 2', 'Tugas 1']);
    const board = await collect<AssignedTask>(await signIn('guru@a.test'), 'view=assigned');
    expect(board.map((task) => task.dueOn)).toEqual(['2099-01-01', '2099-01-02', '2099-01-03', '2099-01-04', '2099-01-05']);
  });
});
