import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as getWorkload } from '@/app/api/staff/workload/route';
import { PATCH as setStatus } from '@/app/api/tasks/[id]/assignments/me/route';
import { PATCH as answerRequest } from '@/app/api/tasks/[id]/extension-requests/[requestId]/route';
import { POST as askForTime } from '@/app/api/tasks/[id]/extension-requests/route';
import { GET as getSuggestion } from '@/app/api/tasks/[id]/extension-suggestion/route';
import { GET as getTask } from '@/app/api/tasks/[id]/route';
import { POST as checkFeasibility } from '@/app/api/tasks/feasibility/route';
import { GET as listTasks, POST as createTask } from '@/app/api/tasks/route';
import { POST as addSlot } from '@/app/api/timetable/slots/route';
import type { FeasibilityResponse, Workload } from '@/features/capacity/interfaces/capacity.interface';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import { countWaitingExtensions } from '@/features/digest/server/digest.repository';
import type { AssignedTask, SentTask, TaskDetail } from '@/features/tasks/interfaces/task.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import type { ExtensionRequest, ExtensionSuggestion } from '../interfaces/extension.interface';

const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

/** Monday 2 November 2026, 07:30 at the school: the start of a working day of 570 minutes (07:30 to 17:00). */
const MONDAY_START = '2026-11-02T07:30:00+08:00';
const MONDAY = '2026-11-02';
const TUESDAY = '2026-11-03';
const WEDNESDAY = '2026-11-04';
const THURSDAY = '2026-11-05';
const NEXT_MONDAY = '2026-11-09';

describe('extensions and workload (Sprint 7)', () => {
  let guru: string;
  let guru2: string;
  let admin: string;
  let sender: string;
  let teacher: string;
  let teacher2: string;

  const newTask = async (body: Record<string, unknown>, cookie = sender) => {
    const response = await call(createTask, '/api/tasks', { method: 'POST', cookie, body: { title: 'Analisis item PPT', ...body } });
    expect(response.status).toBe(201);
    return (await response.json()) as TaskDetail;
  };
  const ask = (taskId: string, cookie: string, body: Record<string, unknown>) =>
    call(askForTime, `/api/tasks/${taskId}/extension-requests`, { method: 'POST', cookie, body, params: { id: taskId } });
  const answer = (taskId: string, requestId: string, cookie: string, body: Record<string, unknown>) =>
    call(answerRequest, `/api/tasks/${taskId}/extension-requests/${requestId}`, { method: 'PATCH', cookie, body, params: { id: taskId, requestId } });
  const suggestion = (taskId: string, cookie: string) =>
    call(getSuggestion, `/api/tasks/${taskId}/extension-suggestion`, { cookie, params: { id: taskId } });
  const detail = async (taskId: string, cookie: string) =>
    (await (await call(getTask, `/api/tasks/${taskId}`, { cookie, params: { id: taskId } })).json()) as TaskDetail;
  const fieldsOf = async (response: Response) => ((await response.json()) as { error: { fields?: Record<string, string> } }).error.fields;
  /** Guru teaches all Monday bar the last hour, so a two-hour task due on Monday cannot fit. */
  const fillMonday = () => call(addSlot, '/api/timetable/slots', {
    method: 'POST', cookie: admin, body: { teacherId: guru, weekday: 1, startTime: '07:30', endTime: '16:00', label: 'Kelas' },
  });

  beforeEach(async () => {
    setTestClock(fixedClock(MONDAY_START));
    await resetDatabase();
    const schoolA = await createSchool('A001');
    const schoolB = await createSchool('B001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    await createUser(schoolA, 'pk@a.test', 'sender');
    guru = await createUser(schoolA, 'guru@a.test', 'teacher');
    guru2 = await createUser(schoolA, 'guru2@a.test', 'teacher');
    await createUser(schoolB, 'admin@b.test', 'admin');
    admin = await signIn('admin@a.test');
    sender = await signIn('pk@a.test');
    teacher = await signIn('guru@a.test');
    teacher2 = await signIn('guru2@a.test');
  });

  afterAll(async () => {
    setTestClock(null);
    await closeQueue();
    await closePool();
  });

  describe('asking', () => {
    it('fills the request in from the teacher\'s own figures, leaving this task out of their other work', async () => {
      await fillMonday();
      const task = await newTask({ dueOn: MONDAY, assigneeIds: [guru, guru2], estimatedMinutes: 120 });
      const response = await suggestion(task.id, teacher);
      expect(response.status).toBe(200);
      expect((await response.json()) as ExtensionSuggestion).toMatchObject({
        dueOn: MONDAY,
        feasibility: {
          feasible: false, neededMinutes: 120, freeMinutes: 60, teachingMinutes: 510, committedMinutes: 0, earliestDueOn: TUESDAY,
        },
      });
      // The colleague has the whole day, and sees their own figures, not guru's.
      const colleague = (await (await suggestion(task.id, teacher2)).json()) as ExtensionSuggestion;
      expect(colleague).toMatchObject({ feasibility: { feasible: true } });
    });

    it('keeps the request on the task with the figures worked out on the server, and allows one open request at a time', async () => {
      await fillMonday();
      const task = await newTask({ dueOn: MONDAY, assigneeIds: [guru, guru2], estimatedMinutes: 120 });
      const asked = await ask(task.id, teacher, { requestedDueOn: TUESDAY, reason: '  Mesyuarat PIBG petang ini  ' });
      expect(asked.status).toBe(201);
      const request = (await asked.json()) as ExtensionRequest;
      expect(request).toMatchObject({
        requestedBy: { id: guru }, currentDueOn: MONDAY, requestedDueOn: TUESDAY, reason: 'Mesyuarat PIBG petang ini',
        neededMinutes: 120, freeMinutes: 60, status: 'pending', decidedBy: null, decidedDueOn: null,
      });

      const again = await ask(task.id, teacher, { requestedDueOn: WEDNESDAY });
      expect(again.status).toBe(409);
      expect(await fieldsOf(again)).toEqual({ requestedDueOn: 'already_pending' });

      // Nothing moves until the sender answers.
      expect(await detail(task.id, teacher)).toMatchObject({ dueOn: MONDAY, myDueOn: MONDAY, extensions: [{ id: request.id }] });
      // The sender sees the request, and the sent list counts it; the other assignee does not see a colleague's request.
      expect((await detail(task.id, sender)).extensions.map((item) => item.id)).toEqual([request.id]);
      expect((await detail(task.id, teacher2)).extensions).toEqual([]);
      const sent = (await (await call(listTasks, '/api/tasks?view=sent', { cookie: sender })).json()) as { items: SentTask[] };
      expect(sent.items[0]).toMatchObject({ id: task.id, pendingExtensions: 1 });
    });

    it('a task without an estimate can still be extended, with no figures', async () => {
      const task = await newTask({ dueOn: MONDAY, assigneeIds: [guru] });
      expect((await (await suggestion(task.id, teacher)).json()) as ExtensionSuggestion).toEqual({ dueOn: MONDAY, feasibility: null });
      const asked = await ask(task.id, teacher, { requestedDueOn: TUESDAY });
      expect((await asked.json()) as ExtensionRequest).toMatchObject({ neededMinutes: null, freeMinutes: null, reason: null });
    });

    it('refuses a date that is not later, a reason that is too long and an unknown field', async () => {
      const task = await newTask({ dueOn: TUESDAY, assigneeIds: [guru] });
      for (const requestedDueOn of [MONDAY, TUESDAY]) {
        const response = await ask(task.id, teacher, { requestedDueOn });
        expect(response.status).toBe(400);
        expect(await fieldsOf(response)).toEqual({ requestedDueOn: 'not_later' });
      }
      expect((await ask(task.id, teacher, { requestedDueOn: 'esok' })).status).toBe(400);
      expect((await ask(task.id, teacher, { requestedDueOn: WEDNESDAY, reason: 'a'.repeat(501) })).status).toBe(400);
      expect((await ask(task.id, teacher, { requestedDueOn: WEDNESDAY, status: 'approved' })).status).toBe(400);
      // More than a year ahead: the capacity check behind the figures would walk every day to it.
      const tooFar = await ask(task.id, teacher, { requestedDueOn: '9999-12-31' });
      expect(tooFar.status).toBe(400);
      expect(await fieldsOf(tooFar)).toEqual({ requestedDueOn: 'too_far_ahead' });
    });

    it('refusal: only an assignee with unfinished, delivered work may ask', async () => {
      const task = await newTask({ dueOn: MONDAY, assigneeIds: [guru], estimatedMinutes: 60 });
      // Not an assignee: a colleague, the sender, and another school's administrator.
      const adminB = await signIn('admin@b.test');
      for (const cookie of [teacher2, sender, adminB]) {
        expect((await ask(task.id, cookie, { requestedDueOn: TUESDAY })).status).toBe(404);
        expect((await suggestion(task.id, cookie)).status).toBe(404);
      }
      expect((await ask('not-a-uuid', teacher, { requestedDueOn: TUESDAY })).status).toBe(404);

      // Finished work needs no more time.
      await call(setStatus, `/api/tasks/${task.id}/assignments/me`, { method: 'PATCH', cookie: teacher, body: { status: 'done' }, params: { id: task.id } });
      expect((await ask(task.id, teacher, { requestedDueOn: TUESDAY })).status).toBe(404);

      // A held task has not reached the teacher yet.
      setTestClock(fixedClock('2026-11-02T22:00:00+08:00'));
      const held = await newTask({ dueOn: WEDNESDAY, assigneeIds: [guru] }, await signIn('pk@a.test'));
      expect(held.deliveredAt).toBeNull();
      expect((await ask(held.id, await signIn('guru@a.test'), { requestedDueOn: THURSDAY })).status).toBe(404);
    });
  });

  describe('answering', () => {
    const askedFor = async (taskId: string, requestedDueOn: string) =>
      (await (await ask(taskId, teacher, { requestedDueOn, reason: 'Sebab peribadi' })).json()) as ExtensionRequest;

    it('approving moves that teacher\'s due date only, and the exchange is on the task and in the audit log', async () => {
      const task = await newTask({ dueOn: MONDAY, assigneeIds: [guru, guru2], estimatedMinutes: 120 });
      const request = await askedFor(task.id, TUESDAY);
      const approved = await answer(task.id, request.id, sender, { decision: 'approve' });
      expect(approved.status).toBe(200);
      expect((await approved.json()) as ExtensionRequest).toMatchObject({ status: 'approved', decidedDueOn: TUESDAY, decidedBy: { name: 'pk' } });

      expect(await detail(task.id, teacher)).toMatchObject({ dueOn: MONDAY, myDueOn: TUESDAY, extensions: [{ status: 'approved' }] });
      expect(await detail(task.id, teacher2)).toMatchObject({ dueOn: MONDAY, myDueOn: MONDAY });
      const seenBySender = await detail(task.id, sender);
      const dueByPerson = Object.fromEntries((seenBySender.assignees ?? []).map((person) => [person.id, person.dueOn]));
      expect(dueByPerson).toEqual({ [guru]: TUESDAY, [guru2]: MONDAY });
      const board = (await (await call(listTasks, '/api/tasks?view=assigned&status=todo', { cookie: teacher })).json()) as { items: AssignedTask[] };
      expect(board.items[0]).toMatchObject({ id: task.id, dueOn: TUESDAY });
      const sent = (await (await call(listTasks, '/api/tasks?view=sent', { cookie: sender })).json()) as { items: SentTask[] };
      expect(sent.items[0]).toMatchObject({ dueOn: MONDAY, pendingExtensions: 0 });

      const { rows } = await getPool().query<{ action: string; metadata: Record<string, unknown> }>(
        `SELECT action, metadata FROM audit_logs WHERE entity_id = $1 AND action LIKE 'extension.%' ORDER BY created_at, id`, [task.id],
      );
      expect(rows).toEqual([
        { action: 'extension.requested', metadata: { requestId: request.id, requestedDueOn: TUESDAY } },
        { action: 'extension.approved', metadata: { requestId: request.id, assigneeId: guru, dueOn: TUESDAY } },
      ]);
      // The reason is the teacher's own words to the sender; it is not copied into the log.
      expect(JSON.stringify(rows)).not.toContain('Sebab peribadi');
    });

    it('the sender may set a different later date, and a teacher who needs longer asks again', async () => {
      const task = await newTask({ dueOn: MONDAY, assigneeIds: [guru] });
      const first = await askedFor(task.id, THURSDAY);
      const tooEarly = await answer(task.id, first.id, sender, { decision: 'propose', dueOn: MONDAY });
      expect(tooEarly.status).toBe(400);
      expect(await fieldsOf(tooEarly)).toEqual({ dueOn: 'not_later' });
      const tooFar = await answer(task.id, first.id, sender, { decision: 'propose', dueOn: '2027-11-04' });
      expect(await fieldsOf(tooFar)).toEqual({ dueOn: 'too_far_ahead' });
      const countered = await answer(task.id, first.id, sender, { decision: 'propose', dueOn: TUESDAY });
      expect((await countered.json()) as ExtensionRequest).toMatchObject({ status: 'countered', requestedDueOn: THURSDAY, decidedDueOn: TUESDAY });
      expect((await detail(task.id, teacher)).myDueOn).toBe(TUESDAY);

      // A minute later (the exchange is listed in the order it happened): the next request starts from the date granted.
      setTestClock(fixedClock('2026-11-02T07:31:00+08:00'));
      const second = await askedFor(task.id, WEDNESDAY);
      expect(second).toMatchObject({ currentDueOn: TUESDAY, status: 'pending' });
      // Proposing exactly what was asked for is an approval.
      const same = await answer(task.id, second.id, sender, { decision: 'propose', dueOn: WEDNESDAY });
      expect((await same.json()) as ExtensionRequest).toMatchObject({ status: 'approved', decidedDueOn: WEDNESDAY });
      expect((await detail(task.id, sender)).extensions.map((item) => item.status)).toEqual(['countered', 'approved']);
    });

    it('refusal: only the task\'s sender answers, once', async () => {
      const task = await newTask({ dueOn: MONDAY, assigneeIds: [guru] });
      const request = await askedFor(task.id, TUESDAY);
      const adminB = await signIn('admin@b.test');
      // The teacher themself, a colleague, an administrator who did not send it, and another school.
      for (const cookie of [teacher, teacher2, admin, adminB]) {
        expect((await answer(task.id, request.id, cookie, { decision: 'approve' })).status).toBe(404);
      }
      expect((await answer(task.id, 'not-a-uuid', sender, { decision: 'approve' })).status).toBe(404);
      expect((await answer(task.id, request.id, sender, { decision: 'refuse' })).status).toBe(400);
      // A request belongs to its task: it cannot be answered through another task the sender owns.
      const other = await newTask({ dueOn: MONDAY, assigneeIds: [guru2] });
      expect((await answer(other.id, request.id, sender, { decision: 'approve' })).status).toBe(404);
      expect((await detail(task.id, teacher)).myDueOn).toBe(MONDAY);

      expect((await answer(task.id, request.id, sender, { decision: 'approve' })).status).toBe(200);
      expect((await answer(task.id, request.id, sender, { decision: 'propose', dueOn: THURSDAY })).status).toBe(409);
      expect((await detail(task.id, teacher)).myDueOn).toBe(TUESDAY);
    });

    it('a date that has gone by the time of the answer cannot be granted', async () => {
      const task = await newTask({ dueOn: MONDAY, assigneeIds: [guru] });
      const request = await askedFor(task.id, TUESDAY);
      // Answered on Wednesday: Tuesday, asked for or proposed, is already past.
      setTestClock(fixedClock('2026-11-04T09:00:00+08:00'));
      const late = await signIn('pk@a.test');
      for (const decision of [{ decision: 'approve' }, { decision: 'propose', dueOn: TUESDAY }]) {
        const response = await answer(task.id, request.id, late, decision);
        expect(response.status).toBe(400);
        expect(await fieldsOf(response)).toEqual({ dueOn: 'past_date' });
      }
      const today = await answer(task.id, request.id, late, { decision: 'propose', dueOn: WEDNESDAY });
      expect((await today.json()) as ExtensionRequest).toMatchObject({ status: 'countered', decidedDueOn: WEDNESDAY });
    });

    it('a request is closed once the teacher finishes the task, and opens again if they move it back', async () => {
      const task = await newTask({ dueOn: MONDAY, assigneeIds: [guru] });
      const request = await askedFor(task.id, TUESDAY);
      const move = (status: string) =>
        call(setStatus, `/api/tasks/${task.id}/assignments/me`, { method: 'PATCH', cookie: teacher, body: { status }, params: { id: task.id } });
      const pendingOnSentList = async () =>
        ((await (await call(listTasks, '/api/tasks?view=sent', { cookie: sender })).json()) as { items: SentTask[] }).items[0].pendingExtensions;
      const { rows: [owner] } = await getPool().query<{ school_id: string; created_by: string }>('SELECT school_id, created_by FROM tasks WHERE id = $1', [task.id]);
      const waitingInDigest = () => countWaitingExtensions(getPool(), owner.school_id, owner.created_by);

      expect((await move('done')).status).toBe(200);
      expect(await pendingOnSentList()).toBe(0);
      expect(await waitingInDigest()).toBe(0);
      expect((await detail(task.id, sender)).extensions).toEqual([]);
      expect((await answer(task.id, request.id, sender, { decision: 'approve' })).status).toBe(409);
      expect((await detail(task.id, teacher)).myDueOn).toBe(MONDAY);

      expect((await move('in_progress')).status).toBe(200);
      expect(await pendingOnSentList()).toBe(1);
      expect(await waitingInDigest()).toBe(1);
      expect((await answer(task.id, request.id, sender, { decision: 'approve' })).status).toBe(200);
    });

    it('an extension moves the work in the capacity check with it', async () => {
      const task = await newTask({ dueOn: MONDAY, assigneeIds: [guru], estimatedMinutes: 500 });
      const check = async () => {
        const body = { assigneeIds: [guru], dueOn: MONDAY, estimatedMinutes: 100 };
        const response = await call(checkFeasibility, '/api/tasks/feasibility', { method: 'POST', cookie: sender, body });
        return ((await response.json()) as FeasibilityResponse).items[0];
      };
      expect(await check()).toMatchObject({ feasible: false, committedMinutes: 500 });
      const request = await askedFor(task.id, TUESDAY);
      await answer(task.id, request.id, sender, { decision: 'approve' });
      expect(await check()).toMatchObject({ feasible: true, committedMinutes: 0 });
    });
  });

  describe('workload when assigning', () => {
    const workload = async (cookie: string) => call(getWorkload, '/api/staff/workload', { cookie });

    it('totals each person\'s estimated, unfinished work due by the end of this week', async () => {
      await newTask({ dueOn: MONDAY, assigneeIds: [guru, guru2], estimatedMinutes: 120 });
      const second = await newTask({ dueOn: THURSDAY, assigneeIds: [guru], estimatedMinutes: 90 });
      // Not counted: due next week, no estimate, and finished.
      await newTask({ dueOn: NEXT_MONDAY, assigneeIds: [guru], estimatedMinutes: 300 });
      await newTask({ dueOn: TUESDAY, assigneeIds: [guru] });
      const finished = await newTask({ dueOn: TUESDAY, assigneeIds: [guru2], estimatedMinutes: 45 });
      await call(setStatus, `/api/tasks/${finished.id}/assignments/me`, { method: 'PATCH', cookie: teacher2, body: { status: 'done' }, params: { id: finished.id } });

      const read = async () => {
        const body = (await (await workload(sender)).json()) as Workload;
        return { weekEndsOn: body.weekEndsOn, byUser: Object.fromEntries(body.items.map((item) => [item.userId, item.committedMinutes])) };
      };
      expect(await read()).toEqual({ weekEndsOn: '2026-11-08', byUser: { [guru]: 210, [guru2]: 120 } });

      // Extended into next week, the work leaves this week's total.
      const request = (await (await ask(second.id, teacher, { requestedDueOn: NEXT_MONDAY })).json()) as ExtensionRequest;
      await answer(second.id, request.id, sender, { decision: 'approve' });
      expect((await read()).byUser).toEqual({ [guru]: 120, [guru2]: 120 });
    });

    it('refusal: teachers cannot read it, and it gives totals only', async () => {
      await newTask({ dueOn: MONDAY, assigneeIds: [guru], estimatedMinutes: 120 });
      expect((await workload(teacher)).status).toBe(404);
      expect((await workload(admin)).status).toBe(200);
      const body = (await (await workload(sender)).json()) as Workload;
      expect(Object.keys(body.items[0]).sort()).toEqual(['committedMinutes', 'userId']);
      // Another school sees none of it.
      expect(((await (await workload(await signIn('admin@b.test'))).json()) as Workload).items).toEqual([]);
    });
  });
});
