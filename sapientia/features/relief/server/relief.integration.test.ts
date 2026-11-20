import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { DELETE as cancelRelief } from '@/app/api/relief/[id]/route';
import { GET as getMyDuties } from '@/app/api/relief/mine/route';
import { GET as getReliefDay, POST as assignRelief } from '@/app/api/relief/route';
import { GET as getSuggestions } from '@/app/api/relief/suggestions/route';
import { POST as addSchoolData } from '@/app/api/school-data/[kind]/route';
import { GET as getFeedback } from '@/app/api/task-type-feedback/route';
import { PATCH as setStatus } from '@/app/api/tasks/[id]/assignments/me/route';
import { PUT as setTimeTaken } from '@/app/api/tasks/[id]/assignments/me/time-taken/route';
import { GET as getTask } from '@/app/api/tasks/[id]/route';
import { POST as checkFeasibility } from '@/app/api/tasks/feasibility/route';
import { POST as createTask } from '@/app/api/tasks/route';
import { POST as addSlot } from '@/app/api/timetable/slots/route';
import type { FeasibilityResponse } from '@/features/capacity/interfaces/capacity.interface';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import type { SchoolDataItem, TaskTypeFeedback } from '@/features/school-data/interfaces/school-data.interface';
import type { TaskDetail } from '@/features/tasks/interfaces/task.interface';
import type { TimetableSlot } from '@/features/timetable/interfaces/timetable.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import type { ReliefAssigned, ReliefDay, ReliefDuty, ReliefSuggestions } from '../interfaces/relief.interface';

const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

/** Monday 2 November 2026, 07:30 at the school: the start of a working day (07:30 to 17:00, Monday to Friday). */
const MONDAY_START = '2026-11-02T07:30:00+08:00';
const MONDAY = '2026-11-02';
const TUESDAY = '2026-11-03';
const SATURDAY = '2026-11-07';
const NEXT_MONDAY = '2026-11-09';

describe('relief and the completion question (Sprint 8)', () => {
  let schoolA: string;
  let schoolB: string;
  let absent: string;
  let ali: string;
  let bala: string;
  let chong: string;
  let devi: string;
  let admin: string;
  let sender: string;
  /** The absent teacher's Monday 08:00 to 09:00 lesson: the period that needs relief. */
  let lesson: TimetableSlot;

  const newSlot = async (teacherId: string, weekday: number, startTime: string, endTime: string, label = 'Kelas') => {
    const body = { teacherId, weekday, startTime, endTime, label };
    const response = await call(addSlot, '/api/timetable/slots', { method: 'POST', cookie: admin, body });
    expect(response.status).toBe(201);
    return (await response.json()) as TimetableSlot;
  };
  const suggestions = (slotId: string, onDate: string, cookie = admin) =>
    call(getSuggestions, `/api/relief/suggestions?slotId=${slotId}&onDate=${onDate}`, { cookie });
  const suggestedNames = async (slotId: string, onDate: string) =>
    ((await (await suggestions(slotId, onDate)).json()) as ReliefSuggestions).items.map((item) => item.teacher.name);
  const assign = (slotId: string, onDate: string, reliefTeacherId: string, cookie = admin) =>
    call(assignRelief, '/api/relief', { method: 'POST', cookie, body: { slotId, onDate, reliefTeacherId } });
  const duties = async (cookie: string) => ((await (await call(getMyDuties, '/api/relief/mine', { cookie })).json()) as { items: ReliefDuty[] }).items;
  const fieldsOf = async (response: Response) => ((await response.json()) as { error: { fields?: Record<string, string> } }).error.fields;
  const newTask = async (body: Record<string, unknown>) => {
    const response = await call(createTask, '/api/tasks', { method: 'POST', cookie: sender, body: { title: 'Kunci masuk markah', ...body } });
    expect(response.status).toBe(201);
    return (await response.json()) as TaskDetail;
  };

  beforeEach(async () => {
    setTestClock(fixedClock(MONDAY_START));
    await resetDatabase();
    schoolA = await createSchool('A001');
    schoolB = await createSchool('B001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    await createUser(schoolA, 'pk@a.test', 'sender');
    absent = await createUser(schoolA, 'absent@a.test', 'teacher');
    ali = await createUser(schoolA, 'ali@a.test', 'teacher');
    bala = await createUser(schoolA, 'bala@a.test', 'teacher');
    chong = await createUser(schoolA, 'chong@a.test', 'teacher');
    devi = await createUser(schoolA, 'devi@a.test', 'teacher');
    await createUser(schoolB, 'admin@b.test', 'admin');
    admin = await signIn('admin@a.test');
    sender = await signIn('pk@a.test');
    lesson = await newSlot(absent, 1, '08:00', '09:00');
    // Everyone teaches something, so all four are candidates; none of it clashes with Monday 08:00 to 09:00.
    for (const teacher of [ali, bala, chong, devi]) await newSlot(teacher, 5, '10:00', '11:00');
  });

  afterAll(async () => {
    setTestClock(null);
    await closeQueue();
    await closePool();
  });

  describe('suggestions (G4)', () => {
    it('suggests three people who are free in the period, by name when nothing else separates them', async () => {
      const response = await suggestions(lesson.id, MONDAY);
      expect(response.status).toBe(200);
      const { items } = (await response.json()) as ReliefSuggestions;
      expect(items.map((item) => item.teacher.name)).toEqual(['ali', 'bala', 'chong']);
      expect(items[0]).toEqual({ teacher: { id: ali, name: 'ali' }, reliefThisMonth: 0, committedMinutesThisWeek: 0 });
    });

    it('leaves out anyone teaching, on a duty, or already covering a class in that period', async () => {
      // Ali teaches across the start of the period; a lesson that ends as it begins does not clash.
      await newSlot(ali, 1, '07:30', '08:10');
      await newSlot(bala, 1, '07:30', '08:00');
      // Chong is covering another colleague's class at the same time.
      const other = await newSlot(devi, 1, '08:30', '09:30', 'Kelas lain');
      expect((await assign(other.id, MONDAY, chong)).status).toBe(201);
      // Devi has relief arranged for her own class, so she is away that day.
      expect(await suggestedNames(lesson.id, MONDAY)).toEqual(['bala']);
      // The same period a week later: the timetables still apply (Ali's lesson, Devi's own class), the relief does not.
      expect(await suggestedNames(lesson.id, NEXT_MONDAY)).toEqual(['bala', 'chong']);
    });

    it('puts fewest relief classes this month first, then least committed work this week', async () => {
      // Ali already covered a class this month; Bala has 300 minutes of work due this week, Chong 60.
      const earlier = await newSlot(absent, 1, '10:00', '11:00', 'Kelas awal');
      expect((await assign(earlier.id, MONDAY, ali)).status).toBe(201);
      await newTask({ dueOn: TUESDAY, assigneeIds: [bala], estimatedMinutes: 300 });
      await newTask({ dueOn: TUESDAY, assigneeIds: [chong], estimatedMinutes: 60 });

      const { items } = (await (await suggestions(lesson.id, MONDAY)).json()) as ReliefSuggestions;
      expect(items.map((item) => [item.teacher.name, item.reliefThisMonth, item.committedMinutesThisWeek])).toEqual([
        ['devi', 0, 0], ['chong', 0, 60], ['bala', 0, 300],
      ]);
      // Three only: Ali, who has done the most relief, is simply not listed.
      expect(items).toHaveLength(3);
    });

    it('only suggests staff who teach, and nobody when no one is free', async () => {
      // The administrator and the sender have no timetable, so they are never suggested.
      expect(await suggestedNames(lesson.id, MONDAY)).not.toContain('admin');
      for (const teacher of [ali, bala, chong, devi]) await newSlot(teacher, 1, '08:00', '09:00');
      expect(await suggestedNames(lesson.id, MONDAY)).toEqual([]);
    });

    it('refuses a date that is the wrong weekday, in the past, not a working day, or a period already over', async () => {
      const reasonFor = async (slotId: string, onDate: string) => {
        const response = await suggestions(slotId, onDate);
        expect(response.status).toBe(400);
        return fieldsOf(response);
      };
      expect(await reasonFor(lesson.id, TUESDAY)).toEqual({ onDate: 'wrong_weekday' });
      expect(await reasonFor(lesson.id, '2026-10-26')).toEqual({ onDate: 'past_date' });
      const weekend = await newSlot(absent, 6, '08:00', '09:00', 'Kelas tambahan');
      expect(await reasonFor(weekend.id, SATURDAY)).toEqual({ onDate: 'not_working_day' });
      await getPool().query(
        `INSERT INTO calendar_events (school_id, on_date, kind, title, created_by)
         SELECT $1, $2, 'holiday', 'Cuti peristiwa', id FROM users WHERE school_id = $1 AND role = 'admin'`,
        [schoolA, NEXT_MONDAY],
      );
      expect(await reasonFor(lesson.id, NEXT_MONDAY)).toEqual({ onDate: 'not_working_day' });
      expect(await reasonFor('9b2f6c1e-7d0a-4a51-9f5e-3c1f2a6b8d47', MONDAY)).toEqual({ slotId: 'invalid_slot' });

      setTestClock(fixedClock('2026-11-02T09:00:00+08:00'));
      // The morning's session has gone idle by then.
      admin = await signIn('admin@a.test');
      expect(await reasonFor(lesson.id, MONDAY)).toEqual({ onDate: 'period_over' });
    });
  });

  describe('assigning', () => {
    it('gives the period to the chosen teacher, who sees it among their duties, and logs it', async () => {
      const response = await assign(lesson.id, MONDAY, bala);
      expect(response.status).toBe(201);
      const assigned = (await response.json()) as ReliefAssigned;
      expect(assigned.held).toBe(false);

      expect(await duties(await signIn('bala@a.test'))).toEqual([{
        id: assigned.id, onDate: MONDAY, startTime: '08:00', endTime: '09:00', class: null, subject: null, label: 'Kelas',
        absentTeacher: { id: absent, name: 'absent' },
      }]);
      expect(await duties(await signIn('ali@a.test'))).toEqual([]);

      const day = (await (await call(getReliefDay, `/api/relief?teacherId=${absent}&onDate=${MONDAY}`, { cookie: admin })).json()) as ReliefDay;
      expect(day).toMatchObject({ teacher: { id: absent }, onDate: MONDAY, canArrange: true });
      expect(day.periods).toHaveLength(1);
      expect(day.periods[0]).toMatchObject({ slot: { id: lesson.id }, relief: { id: assigned.id, reliefTeacher: { id: bala, name: 'bala' }, held: false } });

      const { rows } = await getPool().query<{ action: string; metadata: Record<string, unknown> }>(
        `SELECT action, metadata FROM audit_logs WHERE entity_type = 'relief_assignment' AND entity_id = $1`, [assigned.id],
      );
      expect(rows).toEqual([{
        action: 'relief.assigned',
        metadata: { slotId: lesson.id, onDate: MONDAY, absentTeacherId: absent, reliefTeacherId: bala },
      }]);
    });

    it('holds a relief arranged outside working hours until the next working start', async () => {
      setTestClock(fixedClock('2026-11-02T22:00:00+08:00'));
      admin = await signIn('admin@a.test');
      const assigned = (await (await assign(lesson.id, NEXT_MONDAY, bala)).json()) as ReliefAssigned;
      expect(assigned).toMatchObject({ held: true, deliverAt: new Date('2026-11-03T07:30:00+08:00').toISOString() });
      expect(await duties(await signIn('bala@a.test'))).toEqual([]);
      // The administrator sees that it is arranged and not yet announced.
      const day = (await (await call(getReliefDay, `/api/relief?teacherId=${absent}&onDate=${NEXT_MONDAY}`, { cookie: admin })).json()) as ReliefDay;
      expect(day.periods[0].relief).toMatchObject({ held: true });

      setTestClock(fixedClock('2026-11-03T07:30:00+08:00'));
      expect((await duties(await signIn('bala@a.test'))).map((duty) => duty.id)).toEqual([assigned.id]);
    });

    it('refuses someone who is not free, the absent teacher themself, and a second relief for the same period', async () => {
      await newSlot(ali, 1, '08:30', '09:30');
      const busy = await assign(lesson.id, MONDAY, ali);
      expect(busy.status).toBe(400);
      expect(await fieldsOf(busy)).toEqual({ reliefTeacherId: 'not_free' });
      const self = await assign(lesson.id, MONDAY, absent);
      expect(await fieldsOf(self)).toEqual({ reliefTeacherId: 'same_teacher' });

      expect((await assign(lesson.id, MONDAY, bala)).status).toBe(201);
      const twice = await assign(lesson.id, MONDAY, chong);
      expect(twice.status).toBe(409);
      expect(await fieldsOf(twice)).toEqual({ slotId: 'already_covered' });
      // Bala cannot cover a second class that overlaps the first.
      const overlapping = await newSlot(devi, 1, '08:30', '09:30', 'Kelas lain');
      const clash = await assign(overlapping.id, MONDAY, bala);
      expect(clash.status).toBe(400);
      expect(await fieldsOf(clash)).toEqual({ reliefTeacherId: 'not_free' });
    });

    it('the database itself refuses a relief teacher in two places at once', async () => {
      const overlapping = await newSlot(devi, 1, '08:30', '09:30', 'Kelas lain');
      expect((await assign(lesson.id, MONDAY, bala)).status).toBe(201);
      const insert = getPool().query(
        `INSERT INTO relief_assignments (school_id, slot_id, on_date, absent_teacher_id, relief_teacher_id, start_time, end_time, deliver_at, created_by)
         SELECT $1, $2, $3, $4, $5, '08:30', '09:30', now(), id FROM users WHERE school_id = $1 AND role = 'admin'`,
        [schoolA, overlapping.id, MONDAY, devi, bala],
      );
      await expect(insert).rejects.toMatchObject({ code: '23P01' });
    });

    it('cancelling frees the period and the teacher', async () => {
      const assigned = (await (await assign(lesson.id, MONDAY, bala)).json()) as ReliefAssigned;
      const cancel = (cookie: string) => call(cancelRelief, `/api/relief/${assigned.id}`, { method: 'DELETE', cookie, params: { id: assigned.id } });
      expect((await cancel(admin)).status).toBe(204);
      expect((await cancel(admin)).status).toBe(404);
      expect(await duties(await signIn('bala@a.test'))).toEqual([]);
      expect((await assign(lesson.id, MONDAY, chong)).status).toBe(201);
      const { rows } = await getPool().query<{ action: string }>(
        `SELECT action FROM audit_logs WHERE entity_type = 'relief_assignment' AND entity_id = $1 ORDER BY id`, [assigned.id],
      );
      expect(rows.map((row) => row.action)).toEqual(['relief.assigned', 'relief.cancelled']);
    });

    it('a relief class is not free time in the deadline check', async () => {
      const check = async () => {
        const body = { assigneeIds: [bala], dueOn: MONDAY, estimatedMinutes: 560 };
        const response = await call(checkFeasibility, '/api/tasks/feasibility', { method: 'POST', cookie: sender, body });
        return ((await response.json()) as FeasibilityResponse).items[0];
      };
      expect(await check()).toMatchObject({ feasible: true, teachingMinutes: 0, freeMinutes: 570 });
      await assign(lesson.id, MONDAY, bala);
      expect(await check()).toMatchObject({ feasible: false, teachingMinutes: 60, freeMinutes: 510 });
    });

    it('refusal: only administrators arrange relief, and schools are separate', async () => {
      const teacher = await signIn('ali@a.test');
      const adminB = await signIn('admin@b.test');
      for (const cookie of [teacher, sender]) {
        expect((await suggestions(lesson.id, MONDAY, cookie)).status).toBe(404);
        expect((await assign(lesson.id, MONDAY, bala, cookie)).status).toBe(404);
        expect((await call(getReliefDay, `/api/relief?teacherId=${absent}&onDate=${MONDAY}`, { cookie })).status).toBe(404);
      }
      // School B's administrator cannot see, suggest for, or cover School A's period, nor cancel its relief.
      expect((await suggestions(lesson.id, MONDAY, adminB)).status).toBe(400);
      expect((await assign(lesson.id, MONDAY, bala, adminB)).status).toBe(400);
      expect((await call(getReliefDay, `/api/relief?teacherId=${absent}&onDate=${MONDAY}`, { cookie: adminB })).status).toBe(404);
      const assigned = (await (await assign(lesson.id, MONDAY, bala)).json()) as ReliefAssigned;
      expect((await call(cancelRelief, `/api/relief/${assigned.id}`, { method: 'DELETE', cookie: adminB, params: { id: assigned.id } })).status).toBe(404);
      expect((await call(cancelRelief, `/api/relief/${assigned.id}`, { method: 'DELETE', cookie: teacher, params: { id: assigned.id } })).status).toBe(404);
      // School A's administrator cannot bring in School B's staff.
      const outsider = await createUser(schoolB, 'guru@b.test', 'teacher');
      const other = await newSlot(absent, 1, '11:00', '12:00', 'Kelas lain');
      expect(await fieldsOf(await assign(other.id, MONDAY, outsider))).toEqual({ reliefTeacherId: 'not_free' });
    });
  });

  describe('the completion question', () => {
    const answer = (taskId: string, cookie: string, timeTaken: unknown) =>
      call(setTimeTaken, `/api/tasks/${taskId}/assignments/me/time-taken`, { method: 'PUT', cookie, body: { timeTaken }, params: { id: taskId } });
    const move = (taskId: string, cookie: string, status: string) =>
      call(setStatus, `/api/tasks/${taskId}/assignments/me`, { method: 'PATCH', cookie, body: { status }, params: { id: taskId } });
    const detail = async (taskId: string, cookie: string) =>
      (await (await call(getTask, `/api/tasks/${taskId}`, { cookie, params: { id: taskId } })).json()) as TaskDetail;
    const feedback = async (cookie = admin) => {
      const response = await call(getFeedback, '/api/task-type-feedback', { cookie });
      return { status: response.status, items: response.ok ? ((await response.json()) as { items: TaskTypeFeedback[] }).items : [] };
    };

    it('is optional, belongs to a finished task, and goes when the task is reopened', async () => {
      const task = await newTask({ dueOn: TUESDAY, assigneeIds: [ali] });
      const teacher = await signIn('ali@a.test');
      const early = await answer(task.id, teacher, 'under_1h');
      expect(early.status).toBe(400);
      expect(await fieldsOf(early)).toEqual({ timeTaken: 'not_done' });

      await move(task.id, teacher, 'done');
      expect((await detail(task.id, teacher)).myTimeTaken).toBeNull();
      expect((await answer(task.id, teacher, '1_to_3h')).status).toBe(200);
      expect((await detail(task.id, teacher)).myTimeTaken).toBe('1_to_3h');
      expect((await answer(task.id, teacher, null)).status).toBe(200);
      expect((await detail(task.id, teacher)).myTimeTaken).toBeNull();

      await answer(task.id, teacher, 'over_3h');
      await move(task.id, teacher, 'in_progress');
      await move(task.id, teacher, 'done');
      expect((await detail(task.id, teacher)).myTimeTaken).toBeNull();
    });

    it('refusal: only an assignee answers, with one of the three bands', async () => {
      const task = await newTask({ dueOn: TUESDAY, assigneeIds: [ali] });
      const teacher = await signIn('ali@a.test');
      await move(task.id, teacher, 'done');
      expect((await answer(task.id, sender, 'under_1h')).status).toBe(404);
      expect((await answer(task.id, await signIn('bala@a.test'), 'under_1h')).status).toBe(404);
      expect((await answer(task.id, await signIn('admin@b.test'), 'under_1h')).status).toBe(404);
      expect((await answer(task.id, teacher, '2 jam')).status).toBe(400);
      // The sender never sees an individual answer.
      await answer(task.id, teacher, 'over_3h');
      expect(JSON.stringify(await detail(task.id, sender))).not.toContain('over_3h');
    });

    it('administrators see counts per task type, only once three people have answered', async () => {
      const added = await call(addSchoolData, '/api/school-data/task-types', {
        method: 'POST', cookie: admin, body: { name: 'Kunci masuk markah', estimatedMinutes: 45 }, params: { kind: 'task-types' },
      });
      const type = (await added.json()) as SchoolDataItem;
      const task = await newTask({ dueOn: TUESDAY, assigneeIds: [ali, bala, chong], taskTypeId: type.id });
      const finish = async (email: string, timeTaken: string) => {
        const cookie = await signIn(email);
        await move(task.id, cookie, 'done');
        expect((await answer(task.id, cookie, timeTaken)).status).toBe(200);
      };
      await finish('ali@a.test', '1_to_3h');
      await finish('bala@a.test', '1_to_3h');
      // Two answers could be traced to two people: nothing is shown yet.
      expect((await feedback()).items).toEqual([]);

      await finish('chong@a.test', 'over_3h');
      expect((await feedback()).items).toEqual([{
        taskTypeId: type.id, name: 'Kunci masuk markah', estimatedMinutes: 45, answers: { 'under_1h': 0, '1_to_3h': 2, 'over_3h': 1 },
      }]);
      expect((await feedback(sender)).status).toBe(404);
      expect((await feedback(await signIn('ali@a.test'))).status).toBe(404);
      expect((await feedback(await signIn('admin@b.test'))).items).toEqual([]);
    });
  });
});
