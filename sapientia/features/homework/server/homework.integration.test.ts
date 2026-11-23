import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as studentLogin } from '@/app/api/auth/student-login/route';
import { PUT as setHandIn } from '@/app/api/homework/[id]/hand-ins/[studentId]/route';
import { GET as handIns } from '@/app/api/homework/[id]/hand-ins/route';
import { DELETE as removeHomework, PATCH as updateHomework } from '@/app/api/homework/[id]/route';
import { POST as preview } from '@/app/api/homework/preview/route';
import { GET as myHomework, POST as setHomework } from '@/app/api/homework/route';
import { GET as workload } from '@/app/api/staff/workload/route';
import { GET as pupilHomework } from '@/app/api/student/homework/route';
import { PUT as changePassword } from '@/app/api/student/password/route';
import { GET as pupilTimetable } from '@/app/api/student/timetable/route';
import { POST as addStudents } from '@/app/api/students/route';
import type { Workload } from '@/features/capacity/interfaces/capacity.interface';
import type { AddStudentsResult } from '@/features/students/interfaces/student.interface';
import type { ClassWeek } from '@/features/timetable/interfaces/timetable.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import {
  call, cookieFrom, createSchool, createUser, errorCode, raceAgainstOpenTransaction, resetDatabase, TEST_PASSWORD,
} from '@/shared/server/testing/api-test-kit';
import type { HandInList, Homework, HomeworkPreview, MyHomework, PupilHomeworkList } from '../interfaces/homework.interface';
import { lockClass } from './homework.repository';

// Monday 22 March 2027, 09:00 at the school (Asia/Kuala_Lumpur).
const NOW = new Date('2027-03-22T01:00:00Z');
const MONDAY = '2027-03-22';
const TUESDAY = '2027-03-23';
const WEDNESDAY = '2027-03-24';
const SATURDAY = '2027-03-27';

const staffSignIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

async function insertRow(sql: string, values: unknown[]): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(`${sql} RETURNING id`, values);
  return rows[0].id;
}

describe('homework (Sprint 12)', () => {
  let schoolA: string;
  let classA: string;
  let classA2: string;
  let maths: string;
  let science: string;
  let mathsSlot: string;
  let guruId: string;
  let admin: string;
  let guru: string;
  let guru2: string;

  const lesson = (overrides: Record<string, unknown> = {}) => ({ classId: classA, subjectId: maths, dueOn: WEDNESDAY, ...overrides });
  const set = (body: Record<string, unknown>, cookie = guru) =>
    call(setHomework, '/api/homework', { method: 'POST', cookie, body: { title: 'Latihan pecahan', ...lesson(body) } });
  const setOk = async (body: Record<string, unknown> = {}, cookie = guru): Promise<Homework> => {
    const response = await set(body, cookie);
    expect(response.status).toBe(201);
    return (await response.json()) as Homework;
  };

  /** Adds pupils to a class through the administrator's API and signs the first one in with a password of their own. */
  const pupilIn = async (classId: string, names: string[]) => {
    const added = (await (await call(addStudents, '/api/students', {
      method: 'POST', cookie: admin, body: { classId, students: names.map((name) => ({ name })) },
    })).json()) as AddStudentsResult;
    const slip = added.slips[0];
    const first = cookieFrom(await call(studentLogin, '/api/auth/student-login', {
      method: 'POST', body: { username: slip.username, password: slip.startingPassword },
    }));
    const changed = await call(changePassword, '/api/student/password', {
      method: 'PUT', cookie: first, body: { currentPassword: slip.startingPassword, newPassword: 'my-own-secret' },
    });
    return { ids: added.students.map((student) => student.id), cookie: cookieFrom(changed), username: slip.username };
  };

  beforeEach(async () => {
    setTestClock(fixedClock(NOW));
    await resetDatabase();
    schoolA = await createSchool('A001');
    const schoolB = await createSchool('B001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    guruId = await createUser(schoolA, 'guru@a.test', 'teacher');
    const guru2Id = await createUser(schoolA, 'guru2@a.test', 'teacher');
    await createUser(schoolA, 'pk@a.test', 'sender');
    await createUser(schoolB, 'guru@b.test', 'teacher');
    classA = await insertRow('INSERT INTO classes (school_id, name) VALUES ($1, $2)', [schoolA, '4 Bestari']);
    classA2 = await insertRow('INSERT INTO classes (school_id, name) VALUES ($1, $2)', [schoolA, '4 Cemerlang']);
    maths = await insertRow('INSERT INTO subjects (school_id, name) VALUES ($1, $2)', [schoolA, 'Matematik']);
    science = await insertRow('INSERT INTO subjects (school_id, name) VALUES ($1, $2)', [schoolA, 'Sains']);
    const slot = 'INSERT INTO timetable_slots (school_id, teacher_id, weekday, start_time, end_time, class_id, subject_id) VALUES ($1, $2, $3, $4, $5, $6, $7)';
    mathsSlot = await insertRow(slot, [schoolA, guruId, 1, '10:00', '11:00', classA, maths]);
    await insertRow(slot, [schoolA, guru2Id, 1, '11:00', '12:00', classA, science]);
    await insertRow(slot, [schoolA, guru2Id, 2, '08:00', '09:00', classA2, science]);
    admin = await staffSignIn('admin@a.test');
    guru = await staffSignIn('guru@a.test');
    guru2 = await staffSignIn('guru2@a.test');
  });

  afterEach(() => setTestClock(null));
  afterAll(closePool);

  describe('setting homework', () => {
    it('offers only the lessons on the caller\'s own timetable, and sets homework for one of them', async () => {
      const mine = (await (await call(myHomework, '/api/homework', { cookie: guru })).json()) as MyHomework;
      expect(mine.lessons).toEqual([{ classId: classA, className: '4 Bestari', subjectId: maths, subjectName: 'Matematik' }]);

      const homework = await setOk({ details: 'Soalan 1 hingga 10' });
      expect(homework).toMatchObject({
        class: { name: '4 Bestari' }, subject: { name: 'Matematik' }, title: 'Latihan pecahan', details: 'Soalan 1 hingga 10',
        dueOn: WEDNESDAY, marked: false, loadFlagged: false, handedInCount: 0, pupilCount: 0,
      });
      const after = (await (await call(myHomework, '/api/homework', { cookie: guru })).json()) as MyHomework;
      expect(after.items.map((item) => item.id)).toEqual([homework.id]);
      // Somebody else's list does not include it.
      const theirs = (await (await call(myHomework, '/api/homework', { cookie: guru2 })).json()) as MyHomework;
      expect(theirs.items).toEqual([]);
    });

    it('refuses a class or subject the caller does not teach, and dates out of range', async () => {
      const refused = async (body: Record<string, unknown>, field: string, code: string, cookie = guru) => {
        const response = await set(body, cookie);
        expect(response.status).toBe(400);
        expect(((await response.json()) as { error: { fields: Record<string, string> } }).error.fields[field]).toBe(code);
      };
      await refused({ subjectId: science }, 'classId', 'not_your_lesson');
      await refused({ classId: classA2 }, 'classId', 'not_your_lesson');
      await refused({}, 'classId', 'not_your_lesson', admin);
      await refused({ dueOn: '2027-03-19' }, 'dueOn', 'past_date');
      await refused({ dueOn: SATURDAY }, 'dueOn', 'not_working_day');
      await refused({ dueOn: '2027-05-24' }, 'dueOn', 'too_far');
      await refused({ markingMinutes: 60 }, 'markBy', 'required');
      await refused({ markBy: WEDNESDAY }, 'markingMinutes', 'required');
      await refused({ markingMinutes: 60, markBy: TUESDAY }, 'markBy', 'before_due');
      await refused({ markingMinutes: 601, markBy: WEDNESDAY }, 'markingMinutes', 'too_large');
      await refused({ title: ' ' }, 'title', 'required');
    });

    it('warns when the class would have a third piece due that day, shows dates and subjects only, and flags it when saved', async () => {
      await setOk({ title: 'Kerja 1' });
      await setOk({ subjectId: science, title: 'Kerja 2' }, guru2);
      await setOk({ subjectId: science, title: 'Kerja minggu depan', dueOn: '2027-03-29' }, guru2);

      const response = await call(preview, '/api/homework/preview', { method: 'POST', cookie: guru, body: lesson() });
      expect(response.status).toBe(200);
      const check = (await response.json()) as HomeworkPreview;
      expect(check).toEqual({
        week: [{ dueOn: WEDNESDAY, subjectName: 'Matematik' }, { dueOn: WEDNESDAY, subjectName: 'Sains' }],
        sameDay: 2,
        loadWarning: true,
        marking: null,
      });

      // Warn, never block: it is saved, flagged and logged.
      const third = await setOk({ title: 'Kerja 3' });
      expect(third.loadFlagged).toBe(true);
      const { rows } = await getPool().query("SELECT metadata FROM audit_logs WHERE action = 'homework.load_flagged' AND entity_id = $1", [third.id]);
      expect(rows).toEqual([{ metadata: { alreadyDue: 2 } }]);

      const otherDay = (await (await call(preview, '/api/homework/preview', {
        method: 'POST', cookie: guru, body: lesson({ dueOn: TUESDAY }),
      })).json()) as HomeworkPreview;
      expect(otherDay).toMatchObject({ sameDay: 0, loadWarning: false });
    });

    it('flags the third piece when another teacher is setting work for the same class and day at the same moment', async () => {
      await setOk({ title: 'Kerja 1' });
      // guru2 holds the class and has saved a second piece for Wednesday, not yet committed.
      const response = await raceAgainstOpenTransaction(async (client) => {
        await lockClass(client, schoolA, classA);
        await client.query(
          `INSERT INTO homework (school_id, class_id, subject_id, set_by, title, due_on)
           VALUES ($1, $2, $3, (SELECT id FROM users WHERE email = 'guru2@a.test'), 'Kerja 2', $4)`,
          [schoolA, classA, science, WEDNESDAY],
        );
      }, () => set({ title: 'Kerja 3' }));
      expect(response.status).toBe(201);
      expect(((await response.json()) as Homework).loadFlagged).toBe(true);
    });
  });

  describe('marking time', () => {
    it('is checked against the setter\'s working time before saving', async () => {
      const check = async (body: Record<string, unknown>) => ((await (await call(preview, '/api/homework/preview', {
        method: 'POST', cookie: guru, body: lesson(body),
      })).json()) as HomeworkPreview).marking;
      expect(await check({ dueOn: MONDAY, markingMinutes: 600, markBy: MONDAY })).toMatchObject({ feasible: false, neededMinutes: 600 });
      expect(await check({ markingMinutes: 60, markBy: WEDNESDAY })).toMatchObject({ feasible: true, neededMinutes: 60 });
    });

    it('counts as committed work until it is marked, and frees the time when marked or removed', async () => {
      const workloadOf = async () => ((await (await call(workload, '/api/staff/workload', { cookie: admin })).json()) as Workload)
        .items.find((item) => item.userId === guruId)?.committedMinutes ?? 0;

      const homework = await setOk({ markingMinutes: 90, markBy: '2027-03-26' });
      await setOk({ title: 'Ujian', markingMinutes: 45, markBy: '2027-03-25' });
      expect(await workloadOf()).toBe(135);
      // Planned for next week: not in this week's total.
      await setOk({ title: 'Projek', dueOn: '2027-03-29', markingMinutes: 120, markBy: '2027-03-30' });
      expect(await workloadOf()).toBe(135);

      const marked = await call(updateHomework, `/api/homework/${homework.id}`, { params: { id: homework.id }, method: 'PATCH', cookie: guru, body: { marked: true } });
      expect(marked.status).toBe(200);
      expect(((await marked.json()) as Homework).marked).toBe(true);
      expect(await workloadOf()).toBe(45);

      const unmarked = await call(updateHomework, `/api/homework/${homework.id}`, { params: { id: homework.id }, method: 'PATCH', cookie: guru, body: { marked: false } });
      expect(((await unmarked.json()) as Homework).marked).toBe(false);
      expect(await workloadOf()).toBe(135);

      expect((await call(removeHomework, `/api/homework/${homework.id}`, { params: { id: homework.id }, method: 'DELETE', cookie: guru })).status).toBe(204);
      expect(await workloadOf()).toBe(45);
    });

    it('cannot be marked done on homework without an estimate, and only the setter can mark or remove', async () => {
      const homework = await setOk();
      const response = await call(updateHomework, `/api/homework/${homework.id}`, { params: { id: homework.id }, method: 'PATCH', cookie: guru, body: { marked: true } });
      expect(response.status).toBe(400);
      expect(((await response.json()) as { error: { fields: Record<string, string> } }).error.fields.marked).toBe('no_marking_estimate');

      for (const cookie of [guru2, admin]) {
        expect(await errorCode(await call(updateHomework, `/api/homework/${homework.id}`, { params: { id: homework.id }, method: 'PATCH', cookie, body: { marked: true } })))
          .toBe('not_found');
        expect((await call(removeHomework, `/api/homework/${homework.id}`, { params: { id: homework.id }, method: 'DELETE', cookie })).status).toBe(404);
      }
      expect((await call(removeHomework, '/api/homework/not-a-uuid', { params: { id: 'not-a-uuid' }, method: 'DELETE', cookie: guru })).status).toBe(404);
    });
  });

  describe('paper hand-in', () => {
    it('the setter ticks names on the class list; nobody else sees or changes it', async () => {
      const { ids: [aisyah, daniel] } = await pupilIn(classA, ['Aisyah binti Rahman', 'Daniel Lee']);
      const { ids: [other] } = await pupilIn(classA2, ['Kavitha a/p Raman']);
      const homework = await setOk();
      const tick = (studentId: string, handedIn: boolean, cookie = guru) =>
        call(setHandIn, `/api/homework/${homework.id}/hand-ins/${studentId}`, { params: { id: homework.id, studentId }, method: 'PUT', cookie, body: { handedIn } });

      expect((await tick(aisyah, true)).status).toBe(200);
      expect((await tick(aisyah, true)).status).toBe(200);
      const list = (await (await call(handIns, `/api/homework/${homework.id}/hand-ins`, { params: { id: homework.id }, cookie: guru })).json()) as HandInList;
      expect(list.pupils).toEqual([
        { id: aisyah, name: 'Aisyah binti Rahman', handedIn: true },
        { id: daniel, name: 'Daniel Lee', handedIn: false },
      ]);
      expect(list.homework).toMatchObject({ handedInCount: 1, pupilCount: 2 });

      // A pupil of another class is not on this list, and other staff get 404.
      expect((await tick(other, true)).status).toBe(404);
      for (const cookie of [guru2, admin]) {
        expect((await call(handIns, `/api/homework/${homework.id}/hand-ins`, { params: { id: homework.id }, cookie })).status).toBe(404);
        expect((await tick(daniel, true, cookie)).status).toBe(404);
      }

      expect((await tick(aisyah, false)).status).toBe(200);
      const after = (await (await call(handIns, `/api/homework/${homework.id}/hand-ins`, { params: { id: homework.id }, cookie: guru })).json()) as HandInList;
      expect(after.pupils.every((pupil) => !pupil.handedIn)).toBe(true);
      const { rows } = await getPool().query("SELECT action, metadata FROM audit_logs WHERE entity_id = $1 AND action LIKE 'homework.hand_in%' ORDER BY id", [homework.id]);
      // Ids only: the pupil's id, never their name.
      expect(rows).toEqual([
        { action: 'homework.hand_in_recorded', metadata: { studentId: aisyah } },
        { action: 'homework.hand_in_recorded', metadata: { studentId: aisyah } },
        { action: 'homework.hand_in_cleared', metadata: { studentId: aisyah } },
      ]);
    });
  });

  describe('the pupil', () => {
    it('sees their class\'s homework with their own hand-in only, and nothing of another class', async () => {
      const { ids: [aisyah], cookie: aisyahCookie } = await pupilIn(classA, ['Aisyah binti Rahman', 'Daniel Lee']);
      const { cookie: kavithaCookie } = await pupilIn(classA2, ['Kavitha a/p Raman']);
      const homework = await setOk({ details: 'Soalan 1 hingga 10' });
      await call(setHandIn, `/api/homework/${homework.id}/hand-ins/${aisyah}`, { params: { id: homework.id, studentId: aisyah }, method: 'PUT', cookie: guru, body: { handedIn: true } });

      const list = (await (await call(pupilHomework, '/api/student/homework', { cookie: aisyahCookie })).json()) as PupilHomeworkList;
      expect(list.items).toEqual([{
        id: homework.id, subjectName: 'Matematik', teacherName: 'guru', title: 'Latihan pecahan', details: 'Soalan 1 hingga 10',
        dueOn: WEDNESDAY, handedIn: true, comments: [],
      }]);
      const other = (await (await call(pupilHomework, '/api/student/homework', { cookie: kavithaCookie })).json()) as PupilHomeworkList;
      expect(other.items).toEqual([]);
    });

    it('sees the class\'s hand-ins for this week as counts only, withheld in a class under five pupils', async () => {
      const names = ['Aisyah binti Rahman', 'Daniel Lee', 'Kavitha a/p Raman', 'Mei Ling', 'Arjun Nair'];
      const { ids, cookie } = await pupilIn(classA, names);
      const thisWeek = await setOk();
      const nextWeek = await setOk({ dueOn: '2027-03-29' });
      const handIn = (homeworkId: string, studentId: string) => call(setHandIn, `/api/homework/${homeworkId}/hand-ins/${studentId}`, {
        params: { id: homeworkId, studentId }, method: 'PUT', cookie: guru, body: { handedIn: true },
      });
      await handIn(thisWeek.id, ids[1]);
      await handIn(thisWeek.id, ids[2]);
      await handIn(nextWeek.id, ids[3]);

      const goal = async (pupilCookie: string) =>
        ((await (await call(pupilHomework, '/api/student/homework', { cookie: pupilCookie })).json()) as PupilHomeworkList).classGoal;
      // One piece due this week for five pupils; next week's hand-in does not count.
      expect(await goal(cookie)).toEqual({ handedIn: 2, expected: 5 });

      // A pupil who leaves the class takes their hand-in out of both counts, and four pupils are too few to show it.
      await getPool().query('DELETE FROM students WHERE id = $1', [ids[1]]);
      expect(await goal(cookie)).toBeNull();
    });

    it('cannot use the staff endpoints, and staff cannot use the pupil ones', async () => {
      const { cookie } = await pupilIn(classA, ['Aisyah binti Rahman']);
      expect((await call(myHomework, '/api/homework', { cookie })).status).toBe(401);
      expect((await call(pupilHomework, '/api/student/homework', { cookie: guru })).status).toBe(401);
      expect((await call(pupilTimetable, '/api/student/timetable', { cookie: guru })).status).toBe(401);
    });

    it('gets the class timetable for the week, with holidays empty and relief shown once it is delivered', async () => {
      const { cookie, username } = await pupilIn(classA, ['Aisyah binti Rahman']);
      const relief = await insertRow(
        `INSERT INTO relief_assignments (school_id, slot_id, on_date, absent_teacher_id, relief_teacher_id, start_time, end_time, deliver_at, created_by)
         SELECT $1, $2, $3, $4, u.id, '10:00', '11:00', $5, u.id FROM users u WHERE u.email = 'pk@a.test'`,
        [schoolA, mathsSlot, '2027-03-29', guruId, new Date('2027-03-29T00:00:00Z')],
      );
      expect(relief).toBeTruthy();
      await getPool().query("INSERT INTO calendar_events (school_id, on_date, kind, title, created_by) VALUES ($1, '2027-03-30', 'holiday', 'Cuti', $2)", [schoolA, guruId]);

      const week = async (weekOf: string) =>
        (await (await call(pupilTimetable, `/api/student/timetable?weekOf=${weekOf}`, { cookie })).json()) as ClassWeek;
      const thisWeek = await week(WEDNESDAY);
      expect(thisWeek.weekOf).toBe(MONDAY);
      expect(thisWeek.days).toHaveLength(7);
      expect(thisWeek.days[0].lessons).toEqual([
        { startTime: '10:00', endTime: '11:00', subjectName: 'Matematik', relief: false },
        { startTime: '11:00', endTime: '12:00', subjectName: 'Sains', relief: false },
      ]);
      expect(thisWeek.days[5]).toMatchObject({ date: SATURDAY, schoolDay: false, lessons: [] });

      // Next Monday's maths is covered, but the relief is not delivered yet; Tuesday is a holiday.
      const nextWeek = await week('2027-03-29');
      expect(nextWeek.days[0].lessons[0].relief).toBe(false);
      expect(nextWeek.days[1]).toMatchObject({ schoolDay: false, lessons: [] });
      setTestClock(fixedClock(new Date('2027-03-29T00:30:00Z')));
      // A week later the old session has expired: sign in again.
      const again = cookieFrom(await call(studentLogin, '/api/auth/student-login', {
        method: 'POST', body: { username, password: 'my-own-secret' },
      }));
      const later = (await (await call(pupilTimetable, '/api/student/timetable', { cookie: again })).json()) as ClassWeek;
      expect(later.weekOf).toBe('2027-03-29');
      expect(later.days[0].lessons.map((item) => item.relief)).toEqual([true, false]);
    });
  });
});
