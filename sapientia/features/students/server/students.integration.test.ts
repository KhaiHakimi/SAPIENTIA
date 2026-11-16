import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as studentLogin } from '@/app/api/auth/student-login/route';
import { POST as studentLogout } from '@/app/api/auth/student-logout/route';
import { GET as me } from '@/app/api/me/route';
import { DELETE as removeSchoolData } from '@/app/api/school-data/[kind]/[id]/route';
import { GET as studentMe } from '@/app/api/student/me/route';
import { PUT as changePassword } from '@/app/api/student/password/route';
import { POST as resetPassword } from '@/app/api/students/[id]/password-reset/route';
import { DELETE as removeStudent, PATCH as updateStudent } from '@/app/api/students/[id]/route';
import { GET as listStudents, POST as addStudents } from '@/app/api/students/route';
import type { Page } from '@/shared/interfaces/api-error.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import {
  call, cookieFrom, createSchool, createUser, errorCode, resetDatabase, TEST_ORIGIN, TEST_PASSWORD,
} from '@/shared/server/testing/api-test-kit';
import type { AddStudentsResult, CurrentStudent, SchoolStudent, StudentSlip } from '../interfaces/student.interface';
import { requireStudent } from './current-student.service';

const NOW = new Date('2027-03-22T01:00:00Z');
const at = (minutesLater: number) => setTestClock(fixedClock(new Date(NOW.getTime() + minutesLater * 60_000)));

const staffSignIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));
const pupilSignIn = (username: string, password: string, cookie?: string) =>
  call(studentLogin, '/api/auth/student-login', { method: 'POST', body: { username, password }, cookie });

async function createClass(schoolId: string, name: string): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>('INSERT INTO classes (school_id, name) VALUES ($1, $2) RETURNING id', [schoolId, name]);
  return rows[0].id;
}

describe('pupil accounts (Sprint 11)', () => {
  let schoolA: string;
  let schoolB: string;
  let classA: string;
  let classA2: string;
  let classB: string;
  let admin: string;

  const add = async (students: { name: string; schoolNumber?: string | null }[], classId = classA, cookie = admin) =>
    call(addStudents, '/api/students', { method: 'POST', cookie, body: { classId, students } });

  const addOne = async (name = 'Aisyah binti Rahman'): Promise<StudentSlip> => {
    const response = await add([{ name }]);
    expect(response.status).toBe(201);
    return ((await response.json()) as AddStudentsResult).slips[0];
  };

  /** Signs a new pupil in and chooses their own password; returns the session cookie and the password. */
  const activePupil = async (name?: string) => {
    const slip = await addOne(name);
    const first = cookieFrom(await pupilSignIn(slip.username, slip.startingPassword));
    const changed = await call(changePassword, '/api/student/password', {
      method: 'PUT', cookie: first, body: { currentPassword: slip.startingPassword, newPassword: 'my-own-secret' },
    });
    expect(changed.status).toBe(204);
    return { slip, cookie: cookieFrom(changed), password: 'my-own-secret' };
  };

  beforeEach(async () => {
    at(0);
    await resetDatabase();
    schoolA = await createSchool('A001');
    schoolB = await createSchool('B001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    await createUser(schoolA, 'guru@a.test', 'teacher');
    await createUser(schoolA, 'pk@a.test', 'sender');
    await createUser(schoolB, 'admin@b.test', 'admin');
    classA = await createClass(schoolA, '4 Bestari');
    classA2 = await createClass(schoolA, '4 Cemerlang');
    classB = await createClass(schoolB, '1 Amanah');
    admin = await staffSignIn('admin@a.test');
  });

  afterEach(() => setTestClock(null));
  afterAll(closePool);

  describe('administrators', () => {
    it('add a class list and get a slip for each pupil; only the hash of the slip password is kept', async () => {
      const response = await add([{ name: 'Aisyah binti Rahman', schoolNumber: 'M2027/014' }, { name: 'Daniel Lee' }, { name: '陈伟' }]);
      expect(response.status).toBe(201);
      const result = (await response.json()) as AddStudentsResult;
      expect(result.students.map((student) => student.className)).toEqual(['4 Bestari', '4 Bestari', '4 Bestari']);
      expect(result.students[0]).toMatchObject({ schoolNumber: 'M2027/014', status: 'active', hasOwnPassword: false });
      expect(result.slips.map((slip) => slip.username)).toEqual([
        expect.stringMatching(/^aisyah\d{4}$/), expect.stringMatching(/^daniel\d{4}$/), expect.stringMatching(/^murid\d{4}$/),
      ]);
      expect(result.slips[0].startingPassword).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
      expect(result.slips[0].expiresAt).toBe('2027-04-05T01:00:00.000Z');

      const { rows } = await getPool().query<{ password_hash: string }>('SELECT password_hash FROM students');
      expect(rows.every((row) => row.password_hash.startsWith('$argon2id$'))).toBe(true);
      expect(JSON.stringify(rows)).not.toContain(result.slips[0].startingPassword);

      const audit = await getPool().query<{ action: string; metadata: unknown }>(`SELECT action, metadata FROM audit_logs WHERE entity_type = 'student'`);
      expect(audit.rows).toHaveLength(3);
      expect(JSON.stringify(audit.rows)).not.toMatch(/Aisyah|Daniel|M2027/);
    });

    it('list pupils by name, optionally for one class', async () => {
      await add([{ name: 'Zara' }, { name: 'Amir' }]);
      await add([{ name: 'Mei' }], classA2);
      const all = (await (await call(listStudents, '/api/students', { cookie: admin })).json()) as Page<SchoolStudent>;
      expect(all.items.map((student) => student.name)).toEqual(['Amir', 'Mei', 'Zara']);
      const one = (await (await call(listStudents, `/api/students?classId=${classA2}`, { cookie: admin })).json()) as Page<SchoolStudent>;
      expect(one.items.map((student) => student.name)).toEqual(['Mei']);
      const paged = (await (await call(listStudents, '/api/students?limit=2', { cookie: admin })).json()) as Page<SchoolStudent>;
      expect(paged.items).toHaveLength(2);
      const next = (await (await call(listStudents, `/api/students?limit=2&cursor=${paged.nextCursor}`, { cookie: admin })).json()) as Page<SchoolStudent>;
      expect(next.items.map((student) => student.name)).toEqual(['Zara']);
    });

    it('refuse a MyKad number, a number used twice, a number already taken and too many pupils, adding nobody', async () => {
      const mykad = await add([{ name: 'Satu', schoolNumber: '150101-14-5678' }]);
      expect(mykad.status).toBe(400);
      expect((await mykad.json()).error.fields).toEqual({ 'students.0.schoolNumber': 'looks_like_mykad' });

      const repeated = await add([{ name: 'Satu', schoolNumber: 'A1' }, { name: 'Dua', schoolNumber: 'a1' }]);
      expect(repeated.status).toBe(409);
      expect((await repeated.json()).error.fields).toEqual({ 'students.1.schoolNumber': 'number_repeated' });

      expect((await add([{ name: 'Satu', schoolNumber: 'A1' }])).status).toBe(201);
      const taken = await add([{ name: 'Dua', schoolNumber: 'B2' }, { name: 'Tiga', schoolNumber: 'A1' }]);
      expect((await taken.json()).error.fields).toEqual({ 'students.1.schoolNumber': 'number_taken' });

      const many = await add(Array.from({ length: 51 }, (_, index) => ({ name: `Murid ${index}` })));
      expect((await many.json()).error.fields).toEqual({ students: 'too_many' });

      const { rows } = await getPool().query('SELECT 1 FROM students');
      expect(rows).toHaveLength(1);
    });

    it('move a pupil, correct the name and number, disable and enable them', async () => {
      const { slip, cookie, password } = await activePupil();
      const moved = await call(updateStudent, `/api/students/${slip.studentId}`, {
        method: 'PATCH', cookie: admin, params: { id: slip.studentId }, body: { classId: classA2, name: 'Aisyah Rahman', schoolNumber: 'X9' },
      });
      expect(moved.status).toBe(200);
      expect(await moved.json()).toMatchObject({ className: '4 Cemerlang', name: 'Aisyah Rahman', schoolNumber: 'X9', hasOwnPassword: true });

      const disabled = await call(updateStudent, `/api/students/${slip.studentId}`, {
        method: 'PATCH', cookie: admin, params: { id: slip.studentId }, body: { status: 'disabled' },
      });
      expect(disabled.status).toBe(200);
      expect((await call(studentMe, '/api/student/me', { cookie })).status).toBe(401);
      expect((await pupilSignIn(slip.username, password)).status).toBe(401);

      await call(updateStudent, `/api/students/${slip.studentId}`, { method: 'PATCH', cookie: admin, params: { id: slip.studentId }, body: { status: 'active' } });
      expect((await pupilSignIn(slip.username, password)).status).toBe(204);

      const otherClass = await call(updateStudent, `/api/students/${slip.studentId}`, {
        method: 'PATCH', cookie: admin, params: { id: slip.studentId }, body: { classId: classB },
      });
      expect((await otherClass.json()).error.fields).toEqual({ classId: 'invalid_class' });
    });

    it('print a new slip: the old password stops working and the pupil is signed out', async () => {
      const { slip, cookie, password } = await activePupil();
      const reset = await call(resetPassword, `/api/students/${slip.studentId}/password-reset`, { method: 'POST', cookie: admin, params: { id: slip.studentId } });
      expect(reset.status).toBe(201);
      const fresh = (await reset.json()) as StudentSlip;
      expect(fresh.username).toBe(slip.username);
      expect((await call(studentMe, '/api/student/me', { cookie })).status).toBe(401);
      expect((await pupilSignIn(slip.username, password)).status).toBe(401);
      const signedIn = await pupilSignIn(slip.username, fresh.startingPassword);
      expect(signedIn.status).toBe(204);
      expect(((await (await call(studentMe, '/api/student/me', { cookie: cookieFrom(signedIn) })).json()) as CurrentStudent).mustChangePassword).toBe(true);
    });

    it('remove a pupil who has left; a class with pupils cannot be removed until then', async () => {
      const { slip, password } = await activePupil();
      const inUse = await call(removeSchoolData, `/api/school-data/classes/${classA}`, {
        method: 'DELETE', cookie: admin, params: { kind: 'classes', id: classA },
      });
      expect(inUse.status).toBe(409);

      expect((await call(removeStudent, `/api/students/${slip.studentId}`, { method: 'DELETE', cookie: admin, params: { id: slip.studentId } })).status).toBe(204);
      expect((await pupilSignIn(slip.username, password)).status).toBe(401);
      const { rows } = await getPool().query('SELECT 1 FROM class_enrolments UNION ALL SELECT 1 FROM student_sessions');
      expect(rows).toHaveLength(0);
      expect((await call(removeSchoolData, `/api/school-data/classes/${classA}`, {
        method: 'DELETE', cookie: admin, params: { kind: 'classes', id: classA },
      })).status).toBe(204);
    });
  });

  describe('refusals', () => {
    it('teachers and senders get 404 on every pupil endpoint', async () => {
      const slip = await addOne();
      for (const email of ['guru@a.test', 'pk@a.test']) {
        const cookie = await staffSignIn(email);
        const params = { id: slip.studentId };
        expect((await call(listStudents, '/api/students', { cookie })).status).toBe(404);
        expect((await add([{ name: 'X' }], classA, cookie)).status).toBe(404);
        expect((await call(updateStudent, '/api/students/x', { method: 'PATCH', cookie, params, body: { name: 'Y' } })).status).toBe(404);
        expect((await call(resetPassword, '/api/students/x/password-reset', { method: 'POST', cookie, params })).status).toBe(404);
        expect((await call(removeStudent, '/api/students/x', { method: 'DELETE', cookie, params })).status).toBe(404);
      }
    });

    it("another school's administrator cannot see, change or use this school's pupils or classes", async () => {
      const slip = await addOne();
      const other = await staffSignIn('admin@b.test');
      const params = { id: slip.studentId };
      const list = (await (await call(listStudents, '/api/students', { cookie: other })).json()) as Page<SchoolStudent>;
      expect(list.items).toEqual([]);
      expect((await call(updateStudent, '/api/students/x', { method: 'PATCH', cookie: other, params, body: { name: 'Y' } })).status).toBe(404);
      expect((await call(resetPassword, '/api/students/x/password-reset', { method: 'POST', cookie: other, params })).status).toBe(404);
      expect((await call(removeStudent, '/api/students/x', { method: 'DELETE', cookie: other, params })).status).toBe(404);
      const intoOtherClass = await add([{ name: 'X' }], classA, other);
      expect((await intoOtherClass.json()).error.fields).toEqual({ classId: 'invalid_class' });
    });

    it('without a sign-in, or with a pupil session, the administrator endpoints answer 401', async () => {
      const { cookie } = await activePupil();
      for (const pupilOrNobody of [undefined, cookie]) {
        expect((await call(listStudents, '/api/students', { cookie: pupilOrNobody })).status).toBe(401);
        const body = { classId: classA, students: [{ name: 'X' }] };
        expect((await call(addStudents, '/api/students', { method: 'POST', cookie: pupilOrNobody, body })).status).toBe(401);
        expect((await call(me, '/api/me', { cookie: pupilOrNobody })).status).toBe(401);
      }
    });

    it('a staff session is not a pupil session', async () => {
      expect((await call(studentMe, '/api/student/me', { cookie: admin })).status).toBe(401);
    });
  });

  describe('pupils', () => {
    it('sign in with the slip, must choose their own password first, then sign in with it', async () => {
      const slip = await addOne();
      const signedIn = await pupilSignIn(slip.username.toUpperCase(), slip.startingPassword);
      expect(signedIn.status).toBe(204);
      const cookie = cookieFrom(signedIn);
      const before = (await (await call(studentMe, '/api/student/me', { cookie })).json()) as CurrentStudent;
      expect(before).toEqual({
        student: { id: slip.studentId, name: 'Aisyah binti Rahman', className: '4 Bestari', schoolName: 'Sekolah A001', username: slip.username },
        mustChangePassword: true,
      });
      const request = new Request(`${TEST_ORIGIN}/api/student/anything`, { headers: { cookie } });
      await expect(requireStudent(request, fixedClock(NOW))).rejects.toMatchObject({ status: 403, code: 'password_change_required' });

      const change = (body: object) => call(changePassword, '/api/student/password', { method: 'PUT', cookie, body });
      expect((await (await change({ currentPassword: 'wrong-one', newPassword: 'my-own-secret' })).json()).error.fields)
        .toEqual({ currentPassword: 'wrong_password' });
      expect((await (await change({ currentPassword: slip.startingPassword, newPassword: 'short' })).json()).error.fields)
        .toEqual({ newPassword: 'too_short' });
      expect((await (await change({ currentPassword: slip.startingPassword, newPassword: slip.startingPassword })).json()).error.fields)
        .toEqual({ newPassword: 'same_password' });

      const changed = await change({ currentPassword: slip.startingPassword, newPassword: 'my-own-secret' });
      expect(changed.status).toBe(204);
      expect((await call(studentMe, '/api/student/me', { cookie })).status).toBe(401);
      const fresh = cookieFrom(changed);
      expect(((await (await call(studentMe, '/api/student/me', { cookie: fresh })).json()) as CurrentStudent).mustChangePassword).toBe(false);
      const freshRequest = new Request(TEST_ORIGIN, { headers: { cookie: fresh } });
      await expect(requireStudent(freshRequest, fixedClock(NOW))).resolves.toMatchObject({ id: slip.studentId });

      expect((await pupilSignIn(slip.username, slip.startingPassword)).status).toBe(401);
      expect((await pupilSignIn(slip.username, 'my-own-secret')).status).toBe(204);
      const { rows } = await getPool().query<{ count: string }>('SELECT count(*) FROM student_sessions');
      expect(rows[0].count).toBe('2');
    });

    it('get one answer for an unknown username, a wrong password and an expired slip, and are slowed down', async () => {
      const slip = await addOne();
      const late = await addOne('Daniel Lee');
      expect(await errorCode(await pupilSignIn('nobody1234', 'whatever'))).toBe('invalid_credentials');
      expect(await errorCode(await pupilSignIn(slip.username, 'wrong-pass'))).toBe('invalid_credentials');

      // Five failures for one pupil: the right password is refused too until the window passes.
      for (let attempt = 0; attempt < 4; attempt += 1) await pupilSignIn(slip.username, 'wrong-pass');
      const blocked = await pupilSignIn(slip.username, slip.startingPassword);
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get('retry-after')).toBeTruthy();
      at(16);
      expect((await pupilSignIn(slip.username, slip.startingPassword)).status).toBe(204);

      // A slip unused for 14 days no longer works.
      at(14 * 24 * 60);
      expect(await errorCode(await pupilSignIn(late.username, late.startingPassword))).toBe('invalid_credentials');
    });

    it('are signed out after 30 minutes idle and after signing out', async () => {
      const { cookie, slip, password } = await activePupil();
      at(29);
      expect((await call(studentMe, '/api/student/me', { cookie })).status).toBe(200);
      at(29 + 31);
      expect((await call(studentMe, '/api/student/me', { cookie })).status).toBe(401);

      const again = cookieFrom(await pupilSignIn(slip.username, password));
      expect((await call(studentLogout, '/api/auth/student-logout', { method: 'POST', cookie: again })).status).toBe(204);
      expect((await call(studentMe, '/api/student/me', { cookie: again })).status).toBe(401);
    });

    it('signing in as a pupil ends a staff session in the same browser, and the other way round', async () => {
      const { slip, password } = await activePupil();
      const teacher = await staffSignIn('guru@a.test');
      const asPupil = await pupilSignIn(slip.username, password, teacher);
      expect(asPupil.headers.getSetCookie()).toEqual([expect.stringMatching(/^sapientia_student=.+/), expect.stringMatching(/^sapientia_session=; .*Max-Age=0/)]);
      expect((await call(me, '/api/me', { cookie: teacher })).status).toBe(401);

      const pupil = cookieFrom(asPupil);
      const asTeacher = await call(login, '/api/auth/login', {
        method: 'POST', cookie: pupil, body: { email: 'guru@a.test', password: TEST_PASSWORD },
      });
      expect(asTeacher.headers.getSetCookie()).toEqual([expect.stringMatching(/^sapientia_session=.+/), expect.stringMatching(/^sapientia_student=; .*Max-Age=0/)]);
      expect((await call(studentMe, '/api/student/me', { cookie: pupil })).status).toBe(401);
    });
  });
});
