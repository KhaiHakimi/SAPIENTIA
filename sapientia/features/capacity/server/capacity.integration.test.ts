import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { DELETE as removeItem } from '@/app/api/school-data/[kind]/[id]/route';
import { GET as listItems, POST as addItem } from '@/app/api/school-data/[kind]/route';
import { POST as checkFeasibility } from '@/app/api/tasks/feasibility/route';
import { GET as listTasks, POST as createTask } from '@/app/api/tasks/route';
import { GET as getTimetable } from '@/app/api/timetable/route';
import { DELETE as removeSlot } from '@/app/api/timetable/slots/[id]/route';
import { POST as addSlot } from '@/app/api/timetable/slots/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import type { SchoolDataItem } from '@/features/school-data/interfaces/school-data.interface';
import type { SentTask, TaskDetail } from '@/features/tasks/interfaces/task.interface';
import type { Timetable, TimetableSlot } from '@/features/timetable/interfaces/timetable.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, errorCode, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import type { FeasibilityResponse } from '../interfaces/capacity.interface';

const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

/** Monday 2 November 2026, 07:30 at the school: the start of a working day of 570 minutes (07:30 to 17:00). */
const MONDAY_START = '2026-11-02T07:30:00+08:00';
const MONDAY = '2026-11-02';
const TUESDAY = '2026-11-03';
const DAY = 570;

describe('capacity (Sprint 6): school data, timetable and the feasibility check', () => {
  let schoolB: string;
  let guru: string;
  let guru2: string;
  let guruB: string;
  let admin: string;
  let sender: string;
  let teacher: string;

  const post = (handler: unknown, path: string, cookie: string, body: unknown, params?: Record<string, string>) =>
    call(handler, path, { method: 'POST', cookie, body, params });
  const addTo = async (kind: string, cookie: string, body: unknown) => post(addItem, `/api/school-data/${kind}`, cookie, body, { kind });
  const newItem = async (kind: string, body: unknown) => (await (await addTo(kind, admin, body)).json()) as SchoolDataItem;
  const newSlot = (cookie: string, body: Record<string, unknown>) => post(addSlot, '/api/timetable/slots', cookie, body);
  const feasibility = async (body: Record<string, unknown>) =>
    (await (await post(checkFeasibility, '/api/tasks/feasibility', sender, body)).json()) as FeasibilityResponse;
  const newTask = (body: Record<string, unknown>) => post(createTask, '/api/tasks', sender, { title: 'Analisis item PPT', ...body });

  beforeEach(async () => {
    setTestClock(fixedClock(MONDAY_START));
    await resetDatabase();
    const schoolA = await createSchool('A001');
    schoolB = await createSchool('B001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    await createUser(schoolA, 'pk@a.test', 'sender');
    guru = await createUser(schoolA, 'guru@a.test', 'teacher');
    guru2 = await createUser(schoolA, 'guru2@a.test', 'teacher');
    await createUser(schoolB, 'admin@b.test', 'admin');
    guruB = await createUser(schoolB, 'guru@b.test', 'teacher');
    admin = await signIn('admin@a.test');
    sender = await signIn('pk@a.test');
    teacher = await signIn('guru@a.test');
  });

  afterAll(async () => {
    setTestClock(null);
    await closeQueue();
    await closePool();
  });

  describe('school data', () => {
    it('an administrator adds subjects, classes and task types, and all staff can read them', async () => {
      expect((await addTo('subjects', admin, { name: 'Matematik' })).status).toBe(201);
      expect((await addTo('classes', admin, { name: '4 Bestari' })).status).toBe(201);
      const type = await addTo('task-types', admin, { name: 'Kunci masuk markah', estimatedMinutes: 90 });
      expect(type.status).toBe(201);
      expect(await type.json()).toMatchObject({ name: 'Kunci masuk markah', estimatedMinutes: 90 });

      const seen = await call(listItems, '/api/school-data/task-types', { cookie: teacher, params: { kind: 'task-types' } });
      expect(((await seen.json()) as { items: SchoolDataItem[] }).items.map((item) => item.name)).toEqual(['Kunci masuk markah']);
    });

    it('refuses a duplicate name, a task type without an estimate, and an unknown list', async () => {
      await addTo('subjects', admin, { name: 'Sains' });
      const again = await addTo('subjects', admin, { name: 'sains' });
      expect(again.status).toBe(409);
      expect((await addTo('task-types', admin, { name: 'Tanpa anggaran' })).status).toBe(400);
      expect((await addTo('subjects', admin, { name: 'Sejarah', estimatedMinutes: 30 })).status).toBe(400);
      expect((await addTo('students', admin, { name: 'x' })).status).toBe(404);
    });

    it('refusal: a teacher or sender cannot add or remove, and another school sees nothing of this one', async () => {
      const subject = await newItem('subjects', { name: 'Sejarah' });
      for (const cookie of [teacher, sender]) {
        expect(await errorCode(await addTo('subjects', cookie, { name: 'Geografi' }))).toBe('not_found');
        const removed = await call(removeItem, `/api/school-data/subjects/${subject.id}`, { method: 'DELETE', cookie, params: { kind: 'subjects', id: subject.id } });
        expect(removed.status).toBe(404);
      }
      const adminB = await signIn('admin@b.test');
      const listB = await call(listItems, '/api/school-data/subjects', { cookie: adminB, params: { kind: 'subjects' } });
      expect(((await listB.json()) as { items: SchoolDataItem[] }).items).toEqual([]);
      const removedByB = await call(removeItem, `/api/school-data/subjects/${subject.id}`, { method: 'DELETE', cookie: adminB, params: { kind: 'subjects', id: subject.id } });
      expect(removedByB.status).toBe(404);
    });

    it('will not remove a subject that is on a timetable, and archives a task type instead of deleting it', async () => {
      const subject = await newItem('subjects', { name: 'Matematik' });
      const klass = await newItem('classes', { name: '4 Bestari' });
      await newSlot(admin, { teacherId: guru, weekday: 1, startTime: '08:00', endTime: '09:00', classId: klass.id, subjectId: subject.id });
      const inUse = await call(removeItem, `/api/school-data/subjects/${subject.id}`, { method: 'DELETE', cookie: admin, params: { kind: 'subjects', id: subject.id } });
      expect(inUse.status).toBe(409);

      const type = await newItem('task-types', { name: 'Laporan bulanan', estimatedMinutes: 120 });
      const archived = await call(removeItem, `/api/school-data/task-types/${type.id}`, { method: 'DELETE', cookie: admin, params: { kind: 'task-types', id: type.id } });
      expect(archived.status).toBe(204);
      const { rows } = await getPool().query('SELECT archived_at FROM task_types WHERE id = $1', [type.id]);
      expect(rows[0].archived_at).not.toBeNull();
      // The name is free again once the old type is archived.
      expect((await addTo('task-types', admin, { name: 'Laporan bulanan', estimatedMinutes: 60 })).status).toBe(201);
    });
  });

  describe('timetable', () => {
    it('an administrator builds a teacher\'s week; the teacher sees it, in order', async () => {
      const subject = await newItem('subjects', { name: 'Matematik' });
      const klass = await newItem('classes', { name: '4 Bestari' });
      expect((await newSlot(admin, { teacherId: guru, weekday: 2, startTime: '10:00', endTime: '11:00', label: 'Perhimpunan' })).status).toBe(201);
      const lesson = await newSlot(admin, { teacherId: guru, weekday: 1, startTime: '08:00', endTime: '09:00', classId: klass.id, subjectId: subject.id });
      expect(await lesson.json()).toMatchObject({ weekday: 1, startTime: '08:00', endTime: '09:00', class: { name: '4 Bestari' }, subject: { name: 'Matematik' } });

      const mine = (await (await call(getTimetable, '/api/timetable', { cookie: teacher })).json()) as Timetable;
      expect(mine.slots.map((slot) => [slot.weekday, slot.startTime, slot.label])).toEqual([[1, '08:00', null], [2, '10:00', 'Perhimpunan']]);
    });

    it('refuses overlapping periods for one teacher, but back-to-back periods and another teacher are fine', async () => {
      const slot = { teacherId: guru, weekday: 1, startTime: '08:00', endTime: '09:00', label: 'Tugas pagi' };
      expect((await newSlot(admin, slot)).status).toBe(201);
      const clash = await newSlot(admin, { ...slot, startTime: '08:30', endTime: '09:30' });
      expect(clash.status).toBe(409);
      expect((await newSlot(admin, { ...slot, startTime: '09:00', endTime: '10:00' })).status).toBe(201);
      expect((await newSlot(admin, { ...slot, teacherId: guru2 })).status).toBe(201);
    });

    it('validates the period: end after start, a lesson needs class and subject, anything else needs a label', async () => {
      const subject = await newItem('subjects', { name: 'Sains' });
      const base = { teacherId: guru, weekday: 1, startTime: '08:00', endTime: '09:00' };
      expect((await newSlot(admin, { ...base, label: 'x', endTime: '07:00' })).status).toBe(400);
      expect((await newSlot(admin, base)).status).toBe(400);
      expect((await newSlot(admin, { ...base, subjectId: subject.id })).status).toBe(400);
      expect((await newSlot(admin, { ...base, weekday: 8, label: 'x' })).status).toBe(400);
    });

    it('refusal: only administrators edit; a teacher cannot read a colleague\'s week; schools are separate', async () => {
      const added = (await (await newSlot(admin, { teacherId: guru, weekday: 1, startTime: '08:00', endTime: '09:00', label: 'Tugas pagi' })).json()) as TimetableSlot;
      expect((await newSlot(teacher, { teacherId: guru, weekday: 3, startTime: '08:00', endTime: '09:00', label: 'x' })).status).toBe(404);
      expect((await call(removeSlot, `/api/timetable/slots/${added.id}`, { method: 'DELETE', cookie: teacher, params: { id: added.id } })).status).toBe(404);
      expect((await call(getTimetable, `/api/timetable?teacherId=${guru2}`, { cookie: teacher })).status).toBe(404);
      expect((await call(getTimetable, `/api/timetable?teacherId=${guru2}`, { cookie: sender })).status).toBe(404);
      expect((await call(getTimetable, `/api/timetable?teacherId=${guru2}`, { cookie: admin })).status).toBe(200);

      // School A's administrator cannot timetable or look up School B's teacher, nor use B's class.
      expect((await newSlot(admin, { teacherId: guruB, weekday: 1, startTime: '08:00', endTime: '09:00', label: 'x' })).status).toBe(400);
      expect((await call(getTimetable, `/api/timetable?teacherId=${guruB}`, { cookie: admin })).status).toBe(404);
      const { rows } = await getPool().query<{ id: string }>(`INSERT INTO classes (school_id, name) VALUES ($1, '1 Lain') RETURNING id`, [schoolB]);
      const { rows: subjects } = await getPool().query<{ id: string }>(`INSERT INTO subjects (school_id, name) VALUES ($1, 'Lain') RETURNING id`, [schoolB]);
      const foreign = await newSlot(admin, { teacherId: guru, weekday: 1, startTime: '12:00', endTime: '13:00', classId: rows[0].id, subjectId: subjects[0].id });
      expect(foreign.status).toBe(400);

      const adminB = await signIn('admin@b.test');
      expect((await call(removeSlot, `/api/timetable/slots/${added.id}`, { method: 'DELETE', cookie: adminB, params: { id: added.id } })).status).toBe(404);
      expect((await call(removeSlot, `/api/timetable/slots/${added.id}`, { method: 'DELETE', cookie: admin, params: { id: added.id } })).status).toBe(204);
    });
  });

  describe('feasibility (G4)', () => {
    it('reports each assignee separately, with the earliest realistic date for the one who has no time', async () => {
      // Guru teaches all Monday bar one hour; guru2 is free.
      await newSlot(admin, { teacherId: guru, weekday: 1, startTime: '07:30', endTime: '16:00', label: 'Kelas' });
      const { items } = await feasibility({ assigneeIds: [guru, guru2], dueOn: MONDAY, estimatedMinutes: 120 });
      const byId = new Map(items.map((item) => [item.assignee.id, item]));
      expect(byId.get(guru)).toMatchObject({ feasible: false, freeMinutes: 60, teachingMinutes: 510, earliestDueOn: TUESDAY });
      expect(byId.get(guru2)).toMatchObject({ feasible: true, freeMinutes: DAY, earliestDueOn: MONDAY });
    });

    it('counts work already given, including a held task, and stops counting it once done', async () => {
      const first = (await (await newTask({ dueOn: MONDAY, assigneeIds: [guru], estimatedMinutes: 500 })).json()) as TaskDetail;
      expect(first).toMatchObject({ estimatedMinutes: 500, deadlineFlagged: false });
      const tight = await feasibility({ assigneeIds: [guru], dueOn: MONDAY, estimatedMinutes: 100 });
      expect(tight.items[0]).toMatchObject({ feasible: false, committedMinutes: 500, freeMinutes: 70, earliestDueOn: TUESDAY });

      await getPool().query(`UPDATE task_assignments SET status = 'done', completed_at = now() WHERE task_id = $1`, [first.id]);
      const afterwards = await feasibility({ assigneeIds: [guru], dueOn: MONDAY, estimatedMinutes: 100 });
      expect(afterwards.items[0]).toMatchObject({ feasible: true, committedMinutes: 0 });
    });

    it('gives a task created at night no credit for the evening', async () => {
      setTestClock(fixedClock('2026-11-02T22:00:00+08:00'));
      // The morning's session has gone idle by ten at night.
      sender = await signIn('pk@a.test');
      const { items } = await feasibility({ assigneeIds: [guru], dueOn: TUESDAY, estimatedMinutes: DAY + 30 });
      expect(items[0]).toMatchObject({ feasible: false, workingMinutes: DAY, earliestDueOn: '2026-11-04' });
    });

    it('refusal: teachers cannot run the check, and it will not assess another school\'s staff', async () => {
      const body = { assigneeIds: [guru], dueOn: MONDAY, estimatedMinutes: 60 };
      expect((await post(checkFeasibility, '/api/tasks/feasibility', teacher, body)).status).toBe(404);
      expect((await post(checkFeasibility, '/api/tasks/feasibility', sender, { ...body, assigneeIds: [guruB] })).status).toBe(400);
      expect((await post(checkFeasibility, '/api/tasks/feasibility', sender, { ...body, estimatedMinutes: 1 })).status).toBe(400);
    });
  });

  describe('creating a task with an estimate', () => {
    it('warns but never blocks: an infeasible deadline is saved, flagged and logged', async () => {
      await newSlot(admin, { teacherId: guru, weekday: 1, startTime: '07:30', endTime: '16:00', label: 'Kelas' });
      const created = await newTask({ dueOn: MONDAY, assigneeIds: [guru, guru2], estimatedMinutes: 120 });
      expect(created.status).toBe(201);
      const task = (await created.json()) as TaskDetail;
      expect(task).toMatchObject({ estimatedMinutes: 120, deadlineFlagged: true });

      const { rows } = await getPool().query<{ metadata: Record<string, number> }>(
        `SELECT metadata FROM audit_logs WHERE entity_id = $1 AND action = 'task.deadline_flagged'`, [task.id],
      );
      expect(rows.map((row) => row.metadata)).toEqual([{ shortOfTime: 1, estimatedMinutes: 120 }]);

      const sent = (await (await call(listTasks, '/api/tasks?view=sent', { cookie: sender })).json()) as { items: SentTask[] };
      expect(sent.items[0]).toMatchObject({ id: task.id, deadlineFlagged: true });
    });

    it('uses the task type\'s estimate unless the sender gives their own, and refuses an archived or foreign type', async () => {
      const type = await newItem('task-types', { name: 'Kunci masuk markah', estimatedMinutes: 90 });
      const typical = (await (await newTask({ dueOn: TUESDAY, assigneeIds: [guru], taskTypeId: type.id })).json()) as TaskDetail;
      expect(typical).toMatchObject({ estimatedMinutes: 90, deadlineFlagged: false });
      const withOwn = await newTask({ dueOn: TUESDAY, assigneeIds: [guru], taskTypeId: type.id, estimatedMinutes: 45 });
      const own = (await withOwn.json()) as TaskDetail;
      expect(own.estimatedMinutes).toBe(45);

      await call(removeItem, `/api/school-data/task-types/${type.id}`, { method: 'DELETE', cookie: admin, params: { kind: 'task-types', id: type.id } });
      expect((await newTask({ dueOn: TUESDAY, assigneeIds: [guru], taskTypeId: type.id })).status).toBe(400);
      const { rows } = await getPool().query<{ id: string }>(
        `INSERT INTO task_types (school_id, name, estimated_minutes) VALUES ($1, 'Lain', 30) RETURNING id`, [schoolB],
      );
      expect((await newTask({ dueOn: TUESDAY, assigneeIds: [guru], taskTypeId: rows[0].id })).status).toBe(400);
    });

    it('a task without an estimate is never flagged', async () => {
      await newSlot(admin, { teacherId: guru, weekday: 1, startTime: '07:30', endTime: '17:00', label: 'Kelas' });
      const task = (await (await newTask({ dueOn: MONDAY, assigneeIds: [guru] })).json()) as TaskDetail;
      expect(task).toMatchObject({ estimatedMinutes: null, deadlineFlagged: false });
    });
  });
});
