import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as guardianLogin } from '@/app/api/auth/guardian-login/route';
import { POST as guardianLogout } from '@/app/api/auth/guardian-logout/route';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as studentLogin } from '@/app/api/auth/student-login/route';
import { GET as children } from '@/app/api/guardian/children/route';
import { GET as childWeek } from '@/app/api/guardian/children/[linkId]/timetable/route';
import { POST as refuse } from '@/app/api/guardian/links/[linkId]/refusal/route';
import { GET as guardianMe } from '@/app/api/guardian/me/route';
import { PUT as guardianPassword } from '@/app/api/guardian/password/route';
import { POST as addLink } from '@/app/api/guardians/[id]/links/route';
import { PATCH as removeLink } from '@/app/api/guardians/[id]/links/[linkId]/route';
import { POST as resetPassword } from '@/app/api/guardians/[id]/password-reset/route';
import { DELETE as removeGuardian, PATCH as updateGuardian } from '@/app/api/guardians/[id]/route';
import { GET as listGuardians, POST as addGuardian } from '@/app/api/guardians/route';
import { GET as homeworkOfClass, POST as setHomework } from '@/app/api/homework/route';
import { PUT as setHandIn } from '@/app/api/homework/[id]/hand-ins/[studentId]/route';
import { GET as me } from '@/app/api/me/route';
import { GET as studentMe } from '@/app/api/student/me/route';
import { PUT as studentPassword } from '@/app/api/student/password/route';
import { POST as addStudents } from '@/app/api/students/route';
import type { Homework } from '@/features/homework/interfaces/homework.interface';
import type { AddStudentsResult } from '@/features/students/interfaces/student.interface';
import type { ClassWeek } from '@/features/timetable/interfaces/timetable.interface';
import type { Page } from '@/shared/interfaces/api-error.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool, type Queryable } from '@/shared/server/database.service';
import {
  call, cookieFrom, createSchool, createUser, errorCode, raceAgainstOpenTransaction, resetDatabase, TEST_PASSWORD,
} from '@/shared/server/testing/api-test-kit';
import type { AddGuardianResult, CurrentGuardian, GuardianChildren, SchoolGuardian } from '../interfaces/guardian.interface';
import { lockGuardian } from './guardians.repository';

// Monday 22 March 2027, 09:00 at the school (Asia/Kuala_Lumpur).
const NOW = new Date('2027-03-22T01:00:00Z');
const OWN_PASSWORD = 'my-own-secret-1';

const staffSignIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));
const guardianSignIn = (username: string, password: string, cookie?: string) =>
  call(guardianLogin, '/api/auth/guardian-login', { method: 'POST', body: { username, password }, cookie });

async function insertRow(sql: string, values: unknown[]): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(`${sql} RETURNING id`, values);
  return rows[0].id;
}

describe('guardians (Sprint 13)', () => {
  let schoolA: string;
  let schoolB: string;
  let classA: string;
  let maths: string;
  let admin: string;
  let guru: string;
  let pupils: { aisyah: string; daniel: string; kavitha: string };
  let pupilSlip: { username: string; startingPassword: string };

  const add = (body: Record<string, unknown>, cookie = admin) => call(addGuardian, '/api/guardians', { method: 'POST', cookie, body });
  const addOk = async (studentId = pupils.aisyah, name = 'Rahman bin Ismail', relationship = 'father'): Promise<AddGuardianResult> => {
    const response = await add({ name, studentId, relationship });
    expect(response.status).toBe(201);
    return (await response.json()) as AddGuardianResult;
  };

  /** Adds a guardian, signs them in with the slip and chooses their own password. */
  const activeGuardian = async (studentId = pupils.aisyah, name?: string) => {
    const added = await addOk(studentId, name);
    const first = cookieFrom(await guardianSignIn(added.slip.username, added.slip.startingPassword));
    const changed = await call(guardianPassword, '/api/guardian/password', {
      method: 'PUT', cookie: first, body: { currentPassword: added.slip.startingPassword, newPassword: OWN_PASSWORD },
    });
    expect(changed.status).toBe(204);
    return { ...added, cookie: cookieFrom(changed) };
  };

  const childrenOf = async (cookie: string) =>
    ((await (await call(children, '/api/guardian/children', { cookie })).json()) as GuardianChildren).children;

  beforeEach(async () => {
    setTestClock(fixedClock(NOW));
    await resetDatabase();
    schoolA = await createSchool('A001');
    schoolB = await createSchool('B001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    const guruId = await createUser(schoolA, 'guru@a.test', 'teacher');
    await createUser(schoolA, 'pk@a.test', 'sender');
    await createUser(schoolB, 'admin@b.test', 'admin');
    classA = await insertRow('INSERT INTO classes (school_id, name) VALUES ($1, $2)', [schoolA, '4 Bestari']);
    const classA2 = await insertRow('INSERT INTO classes (school_id, name) VALUES ($1, $2)', [schoolA, '4 Cemerlang']);
    maths = await insertRow('INSERT INTO subjects (school_id, name) VALUES ($1, $2)', [schoolA, 'Matematik']);
    await insertRow(
      'INSERT INTO timetable_slots (school_id, teacher_id, weekday, start_time, end_time, class_id, subject_id) VALUES ($1, $2, 1, $3, $4, $5, $6)',
      [schoolA, guruId, '10:00', '11:00', classA, maths],
    );
    admin = await staffSignIn('admin@a.test');
    guru = await staffSignIn('guru@a.test');
    const added = (await (await call(addStudents, '/api/students', {
      method: 'POST', cookie: admin, body: { classId: classA, students: [{ name: 'Aisyah binti Rahman' }, { name: 'Daniel Lee' }] },
    })).json()) as AddStudentsResult;
    const other = (await (await call(addStudents, '/api/students', {
      method: 'POST', cookie: admin, body: { classId: classA2, students: [{ name: 'Kavitha a/p Raman' }] },
    })).json()) as AddStudentsResult;
    pupils = { aisyah: added.students[0].id, daniel: added.students[1].id, kavitha: other.students[0].id };
    pupilSlip = added.slips[0];
  });

  afterEach(() => setTestClock(null));
  afterAll(closePool);

  describe('administrators', () => {
    it('add a guardian with a link and get a slip; only the hash of the slip password is kept', async () => {
      const { guardian, slip } = await addOk();
      expect(slip).toMatchObject({ name: 'Rahman bin Ismail', children: ['Aisyah binti Rahman'] });
      expect(slip.username).toMatch(/^penjaga\.rahman\d{4}$/);
      expect(slip.startingPassword).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
      expect(guardian).toMatchObject({
        name: 'Rahman bin Ismail', status: 'active', hasOwnPassword: false,
        links: [{ student: { id: pupils.aisyah, name: 'Aisyah binti Rahman', className: '4 Bestari' }, relationship: 'father', status: 'active', endReason: null }],
      });
      const { rows } = await getPool().query<{ password_hash: string }>('SELECT password_hash FROM guardians WHERE id = $1', [guardian.id]);
      expect(rows[0].password_hash).toMatch(/^\$argon2id\$/);
      expect(rows[0].password_hash).not.toContain(slip.startingPassword);

      const page = (await (await call(listGuardians, '/api/guardians', { cookie: admin })).json()) as Page<SchoolGuardian>;
      expect(page.items.map((item) => item.id)).toEqual([guardian.id]);
    });

    it('link a guardian to more children, never twice to the same child, and refuse a pupil of another school', async () => {
      const { guardian } = await addOk();
      const link = (studentId: string, cookie = admin) => call(addLink, `/api/guardians/${guardian.id}/links`, {
        params: { id: guardian.id }, method: 'POST', cookie, body: { studentId, relationship: 'father' },
      });
      const second = await link(pupils.daniel);
      expect(second.status).toBe(201);
      expect(((await second.json()) as SchoolGuardian).links.map((item) => item.student.name)).toEqual(['Aisyah binti Rahman', 'Daniel Lee']);

      const twice = await link(pupils.aisyah);
      expect(twice.status).toBe(409);
      const otherSchoolAdmin = await staffSignIn('admin@b.test');
      expect((await link(pupils.kavitha, otherSchoolAdmin)).status).toBe(404);
      expect((await add({ name: 'Ali', studentId: '00000000-0000-4000-8000-000000000000', relationship: 'father' })).status).toBe(400);
      expect((await add({ name: 'Ali', studentId: pupils.aisyah, relationship: 'uncle' })).status).toBe(400);
    });

    it('stop at GUARDIAN_LINKS_MAX children when another link is being added at the same moment', async () => {
      const { guardian } = await addOk();
      // Ten more pupils in 4 Bestari, straight into the tables (no slips needed); eight linked already, so the guardian has nine.
      const { rows: extra } = await getPool().query<{ id: string }>(
        `INSERT INTO students (school_id, name, username, password_hash, must_change_password)
         SELECT $1, 'Murid ' || n, 'murid' || lpad(n::text, 4, '0'), 'not-a-hash', false FROM generate_series(1, 10) AS n
         RETURNING id`,
        [schoolA],
      );
      await getPool().query('INSERT INTO class_enrolments (school_id, student_id, class_id) SELECT $1, s, $2 FROM unnest($3::uuid[]) AS s', [
        schoolA, classA, extra.map((row) => row.id),
      ]);
      const insertLinks = (db: Queryable, studentIds: string[]) => db.query(
        `INSERT INTO guardian_links (school_id, guardian_id, student_id, relationship, created_by)
         SELECT $1, $2, s, 'father', (SELECT id FROM users WHERE email = 'admin@a.test') FROM unnest($3::uuid[]) AS s`,
        [schoolA, guardian.id, studentIds],
      );
      await insertLinks(getPool(), extra.slice(0, 8).map((row) => row.id));

      // Another administrator holds the guardian and has added the tenth link, not yet committed.
      const response = await raceAgainstOpenTransaction(async (client) => {
        await lockGuardian(client, schoolA, guardian.id);
        await insertLinks(client, [extra[8].id]);
      }, () => call(addLink, `/api/guardians/${guardian.id}/links`, {
        params: { id: guardian.id }, method: 'POST', cookie: admin, body: { studentId: extra[9].id, relationship: 'father' },
      }));
      expect(response.status).toBe(400);
      const { rows } = await getPool().query("SELECT count(*)::int AS total FROM guardian_links WHERE guardian_id = $1 AND status = 'active'", [
        guardian.id,
      ]);
      expect(rows[0].total).toBe(10);
    });

    it('remove a link with a reason code; the audit log keeps ids and the code only', async () => {
      const { guardian, cookie } = await activeGuardian();
      const linkId = guardian.links[0].id;
      const remove = (reason: string) => call(removeLink, `/api/guardians/${guardian.id}/links/${linkId}`, {
        params: { id: guardian.id, linkId }, method: 'PATCH', cookie: admin, body: { reason },
      });
      expect((await remove('not_my_child')).status).toBe(400); // a guardian's reason, not the administrator's
      const removed = await remove('entered_in_error');
      expect(removed.status).toBe(200);
      expect(((await removed.json()) as SchoolGuardian).links[0]).toMatchObject({ status: 'removed', endReason: 'entered_in_error' });
      expect((await remove('entered_in_error')).status).toBe(404);

      expect(await childrenOf(cookie)).toEqual([]);
      const { rows } = await getPool().query("SELECT action, metadata FROM audit_logs WHERE entity_type = 'guardian' ORDER BY id");
      expect(rows.map((row) => row.action)).toEqual(['guardian.added', 'guardian.link_added', 'guardian.link_removed']);
      expect(JSON.stringify(rows)).not.toMatch(/Rahman|Aisyah/);
    });

    it('print a new slip, disable and remove a guardian; each signs them out', async () => {
      const { guardian, cookie } = await activeGuardian();
      const slip = await call(resetPassword, `/api/guardians/${guardian.id}/password-reset`, { params: { id: guardian.id }, method: 'POST', cookie: admin });
      expect(slip.status).toBe(201);
      expect((await call(guardianMe, '/api/guardian/me', { cookie })).status).toBe(401);
      expect((await guardianSignIn(guardian.username, OWN_PASSWORD)).status).toBe(401);

      const patch = (body: Record<string, unknown>) => call(updateGuardian, `/api/guardians/${guardian.id}`, {
        params: { id: guardian.id }, method: 'PATCH', cookie: admin, body,
      });
      expect(((await (await patch({ status: 'disabled' })).json()) as SchoolGuardian).status).toBe('disabled');
      const { startingPassword } = (await slip.json()) as { startingPassword: string };
      expect((await guardianSignIn(guardian.username, startingPassword)).status).toBe(401);

      expect((await call(removeGuardian, `/api/guardians/${guardian.id}`, { params: { id: guardian.id }, method: 'DELETE', cookie: admin })).status).toBe(204);
      const { rows } = await getPool().query('SELECT count(*)::int AS links FROM guardian_links');
      expect(rows[0].links).toBe(0);
    });
  });

  describe('refusals', () => {
    it('teachers, senders, pupils, guardians and other schools get 404 or 401 on the administrator endpoints', async () => {
      const { guardian, cookie: guardianCookie } = await activeGuardian();
      const pupilFirst = cookieFrom(await call(studentLogin, '/api/auth/student-login', {
        method: 'POST', body: { username: pupilSlip.username, password: pupilSlip.startingPassword },
      }));
      const pupil = cookieFrom(await call(studentPassword, '/api/student/password', {
        method: 'PUT', cookie: pupilFirst, body: { currentPassword: pupilSlip.startingPassword, newPassword: 'pupil-own-1' },
      }));
      const patchAs = (cookie: string) => call(updateGuardian, `/api/guardians/${guardian.id}`, {
        params: { id: guardian.id }, method: 'PATCH', cookie, body: { status: 'disabled' },
      });
      for (const cookie of [guru, await staffSignIn('pk@a.test')]) {
        expect((await call(listGuardians, '/api/guardians', { cookie })).status).toBe(404);
        expect((await add({ name: 'Ali', studentId: pupils.aisyah, relationship: 'father' }, cookie)).status).toBe(404);
        expect((await patchAs(cookie)).status).toBe(404);
      }
      // Another school's administrator sees none of this school's guardians and cannot link to its pupils.
      const otherAdmin = await staffSignIn('admin@b.test');
      expect(((await (await call(listGuardians, '/api/guardians', { cookie: otherAdmin })).json()) as Page<SchoolGuardian>).items).toEqual([]);
      expect((await add({ name: 'Ali', studentId: pupils.aisyah, relationship: 'father' }, otherAdmin)).status).toBe(400);
      expect((await patchAs(otherAdmin)).status).toBe(404);
      for (const cookie of [pupil, guardianCookie]) {
        expect((await call(listGuardians, '/api/guardians', { cookie })).status).toBe(401);
      }
      // And no staff or pupil session is a guardian session.
      for (const cookie of [admin, pupil]) expect((await call(children, '/api/guardian/children', { cookie })).status).toBe(401);
    });
  });

  describe('the guardian', () => {
    it('signs in with the slip, must choose a password of at least 10 characters first, then signs in with it', async () => {
      const { slip } = await addOk();
      const first = cookieFrom(await guardianSignIn(slip.username, slip.startingPassword));
      expect((await call(children, '/api/guardian/children', { cookie: first })).status).toBe(403);
      const before = (await (await call(guardianMe, '/api/guardian/me', { cookie: first })).json()) as CurrentGuardian;
      expect(before).toEqual({
        guardian: { id: slip.guardianId, name: 'Rahman bin Ismail', schoolName: 'Sekolah A001', timeZone: 'Asia/Kuala_Lumpur', username: slip.username },
        mustChangePassword: true,
      });
      const short = await call(guardianPassword, '/api/guardian/password', {
        method: 'PUT', cookie: first, body: { currentPassword: slip.startingPassword, newPassword: 'short-one' },
      });
      expect(short.status).toBe(400);
      const changed = await call(guardianPassword, '/api/guardian/password', {
        method: 'PUT', cookie: first, body: { currentPassword: slip.startingPassword, newPassword: OWN_PASSWORD },
      });
      expect(changed.status).toBe(204);
      expect((await call(guardianMe, '/api/guardian/me', { cookie: first })).status).toBe(401);
      expect((await guardianSignIn(slip.username, OWN_PASSWORD)).status).toBe(204);
      expect(await errorCode(await guardianSignIn('penjaga.nobody0000', OWN_PASSWORD))).toBe(await errorCode(await guardianSignIn(slip.username, 'wrong-password')));
    });

    it('sees only their linked child: homework with this child\'s own hand-in, and the class week', async () => {
      const { cookie, guardian } = await activeGuardian();
      const homework = (await (await call(setHomework, '/api/homework', {
        method: 'POST', cookie: guru, body: { classId: classA, subjectId: maths, title: 'Latihan pecahan', dueOn: '2027-03-24' },
      })).json()) as Homework;
      // Daniel's hand-in is recorded, not Aisyah's: her guardian must see "not handed in".
      await call(setHandIn, `/api/homework/${homework.id}/hand-ins/${pupils.daniel}`, {
        params: { id: homework.id, studentId: pupils.daniel }, method: 'PUT', cookie: guru, body: { handedIn: true },
      });
      expect((await call(homeworkOfClass, '/api/homework', { cookie })).status).toBe(401);

      const [child] = await childrenOf(cookie);
      expect(child).toEqual({
        linkId: guardian.links[0].id, name: 'Aisyah binti Rahman', className: '4 Bestari', relationship: 'father',
        homework: [expect.objectContaining({ title: 'Latihan pecahan', subjectName: 'Matematik', handedIn: false })],
      });
      expect(JSON.stringify(child)).not.toContain(pupils.aisyah); // the pupil's id is never sent to a guardian

      const week = await call(childWeek, `/api/guardian/children/${child.linkId}/timetable`, { params: { linkId: child.linkId }, cookie });
      expect(((await week.json()) as ClassWeek).days[0].lessons).toEqual([{ startTime: '10:00', endTime: '11:00', subjectName: 'Matematik', relief: false }]);

      // Another guardian's link is 404, as is a made-up one.
      const other = await activeGuardian(pupils.kavitha, 'Raman a/l Muthu');
      const theirLink = other.guardian.links[0].id;
      expect((await call(childWeek, `/api/guardian/children/${theirLink}/timetable`, { params: { linkId: theirLink }, cookie })).status).toBe(404);
      expect((await call(refuse, `/api/guardian/links/${theirLink}/refusal`, {
        params: { linkId: theirLink }, method: 'POST', cookie, body: { reason: 'not_my_child' },
      })).status).toBe(404);
    });

    it('refuses a wrong link with a reason; the child leaves the view and the administrator sees why', async () => {
      const { cookie, guardian } = await activeGuardian();
      const linkId = guardian.links[0].id;
      const refusal = (reason: string) => call(refuse, `/api/guardian/links/${linkId}/refusal`, {
        params: { linkId }, method: 'POST', cookie, body: { reason },
      });
      expect((await refusal('school_decision')).status).toBe(400); // an administrator's reason, not a guardian's
      expect((await refusal('not_my_child')).status).toBe(204);
      expect((await refusal('not_my_child')).status).toBe(404);
      expect(await childrenOf(cookie)).toEqual([]);
      expect((await call(childWeek, `/api/guardian/children/${linkId}/timetable`, { params: { linkId }, cookie })).status).toBe(404);

      const page = (await (await call(listGuardians, '/api/guardians', { cookie: admin })).json()) as Page<SchoolGuardian>;
      expect(page.items[0].links[0]).toMatchObject({ status: 'refused', endReason: 'not_my_child' });
      // The administrator may link again if the refusal was a mistake.
      expect((await call(addLink, `/api/guardians/${guardian.id}/links`, {
        params: { id: guardian.id }, method: 'POST', cookie: admin, body: { studentId: pupils.aisyah, relationship: 'father' },
      })).status).toBe(201);
    });

    it('signing in as a guardian ends a staff or pupil session in the same browser, and the other way round', async () => {
      const { slip } = await activeGuardian();
      const teacher = await staffSignIn('guru@a.test');
      const asGuardian = await guardianSignIn(slip.username, OWN_PASSWORD, teacher);
      expect(asGuardian.headers.getSetCookie()).toEqual([
        expect.stringMatching(/^sapientia_guardian=.+/), expect.stringMatching(/^sapientia_session=; .*Max-Age=0/),
      ]);
      expect((await call(me, '/api/me', { cookie: teacher })).status).toBe(401);

      const guardianCookie = cookieFrom(asGuardian);
      const asPupil = await call(studentLogin, '/api/auth/student-login', {
        method: 'POST', cookie: guardianCookie, body: { username: pupilSlip.username, password: pupilSlip.startingPassword },
      });
      expect(asPupil.headers.getSetCookie()).toEqual([
        expect.stringMatching(/^sapientia_student=.+/), expect.stringMatching(/^sapientia_guardian=; .*Max-Age=0/),
      ]);
      expect((await call(guardianMe, '/api/guardian/me', { cookie: guardianCookie })).status).toBe(401);
      expect((await call(studentMe, '/api/student/me', { cookie: cookieFrom(asPupil) })).status).toBe(200);
    });

    it('is signed out after signing out', async () => {
      const { cookie } = await activeGuardian();
      expect((await call(guardianLogout, '/api/auth/guardian-logout', { method: 'POST', cookie })).status).toBe(204);
      expect((await call(guardianMe, '/api/guardian/me', { cookie })).status).toBe(401);
    });
  });
});
