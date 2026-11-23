import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as guardianLogin } from '@/app/api/auth/guardian-login/route';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as studentLogin } from '@/app/api/auth/student-login/route';
import { GET as children } from '@/app/api/guardian/children/route';
import { PUT as guardianPassword } from '@/app/api/guardian/password/route';
import { POST as addGuardian } from '@/app/api/guardians/route';
import { PATCH as hideComment } from '@/app/api/homework/[id]/comments/[commentId]/route';
import { GET as listComments, POST as addComment } from '@/app/api/homework/[id]/comments/route';
import { PUT as tickHandIn } from '@/app/api/homework/[id]/hand-ins/[studentId]/route';
import { GET as listHandIns } from '@/app/api/homework/[id]/hand-ins/route';
import { POST as setHomework } from '@/app/api/homework/route';
import { GET as pupilHomework } from '@/app/api/student/homework/route';
import { PUT as studentPassword } from '@/app/api/student/password/route';
import { POST as addStudents } from '@/app/api/students/route';
import type { AddGuardianResult, GuardianChildren } from '@/features/guardians/interfaces/guardian.interface';
import type { AddStudentsResult } from '@/features/students/interfaces/student.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import {
  call, cookieFrom, createSchool, createUser, raceAgainstOpenTransaction, resetDatabase, TEST_PASSWORD,
} from '@/shared/server/testing/api-test-kit';
import type { Homework, HomeworkComment, HomeworkComments, PupilHomeworkList } from '../interfaces/homework.interface';
import { lockHomework } from './homework.repository';

// Monday 22 March 2027, 09:00 at the school.
const NOW = new Date('2027-03-22T01:00:00Z');

const staffSignIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

async function insertRow(sql: string, values: unknown[]): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(`${sql} RETURNING id`, values);
  return rows[0].id;
}

/** Teacher-to-pupil notes on homework (plan Phase 4, Sprint 14): written by the setter, read by the pupil and guardians. */
describe('homework comments (Sprint 14)', () => {
  let school: string;
  let guru: string;
  let homework: Homework;
  let pupils: { aisyah: string; daniel: string };
  let slips: AddStudentsResult['slips'];
  let admin: string;

  const comments = (id: string) => `/api/homework/${id}/comments`;
  const write = (body: Record<string, unknown>, cookie = guru) =>
    call(addComment, comments(homework.id), { params: { id: homework.id }, method: 'POST', cookie, body });
  const pupilSignIn = async (index: number) => {
    const first = cookieFrom(await call(studentLogin, '/api/auth/student-login', {
      method: 'POST', body: { username: slips[index].username, password: slips[index].startingPassword },
    }));
    return cookieFrom(await call(studentPassword, '/api/student/password', {
      method: 'PUT', cookie: first, body: { currentPassword: slips[index].startingPassword, newPassword: 'pupil-own-1' },
    }));
  };
  const notesFor = async (cookie: string) =>
    ((await (await call(pupilHomework, '/api/student/homework', { cookie })).json()) as PupilHomeworkList).items[0].comments;

  beforeEach(async () => {
    setTestClock(fixedClock(NOW));
    await resetDatabase();
    school = await createSchool('A001');
    await createUser(school, 'admin@a.test', 'admin');
    const guruId = await createUser(school, 'guru@a.test', 'teacher');
    await createUser(school, 'lain@a.test', 'teacher');
    const classA = await insertRow('INSERT INTO classes (school_id, name) VALUES ($1, $2)', [school, '4 Bestari']);
    const maths = await insertRow('INSERT INTO subjects (school_id, name) VALUES ($1, $2)', [school, 'Matematik']);
    await insertRow(
      `INSERT INTO timetable_slots (school_id, teacher_id, weekday, start_time, end_time, class_id, subject_id)
       VALUES ($1, $2, 1, '10:00', '11:00', $3, $4)`,
      [school, guruId, classA, maths],
    );
    admin = await staffSignIn('admin@a.test');
    guru = await staffSignIn('guru@a.test');
    const added = (await (await call(addStudents, '/api/students', {
      method: 'POST', cookie: admin, body: { classId: classA, students: [{ name: 'Aisyah binti Rahman' }, { name: 'Daniel Lee' }] },
    })).json()) as AddStudentsResult;
    pupils = { aisyah: added.students[0].id, daniel: added.students[1].id };
    slips = added.slips;
    homework = (await (await call(setHomework, '/api/homework', {
      method: 'POST', cookie: guru, body: { classId: classA, subjectId: maths, title: 'Latihan pecahan', dueOn: '2027-03-24' },
    })).json()) as Homework;
  });

  afterEach(() => setTestClock(null));
  afterAll(closePool);

  it('the setter writes to one pupil; only that pupil and their guardian see it, and the pupil cannot reply', async () => {
    const response = await write({ studentId: pupils.aisyah, body: 'Bagus, Aisyah! Semak soalan 4 sekali lagi.' });
    expect(response.status).toBe(201);
    const comment = (await response.json()) as HomeworkComment;
    expect(comment).toMatchObject({ studentId: pupils.aisyah, body: 'Bagus, Aisyah! Semak soalan 4 sekali lagi.', hidden: false });

    const aisyah = await pupilSignIn(0);
    const daniel = await pupilSignIn(1);
    expect(await notesFor(aisyah)).toEqual([{ id: comment.id, body: comment.body, createdAt: NOW.toISOString() }]);
    expect(await notesFor(daniel)).toEqual([]);
    // A pupil session cannot write or read the teacher's list.
    expect((await write({ studentId: pupils.aisyah, body: 'Terima kasih cikgu' }, aisyah)).status).toBe(401);

    const added = (await (await call(addGuardian, '/api/guardians', {
      method: 'POST', cookie: admin, body: { name: 'Rahman bin Ismail', studentId: pupils.aisyah, relationship: 'father' },
    })).json()) as AddGuardianResult;
    const first = cookieFrom(await call(guardianLogin, '/api/auth/guardian-login', {
      method: 'POST', body: { username: added.slip.username, password: added.slip.startingPassword },
    }));
    const father = cookieFrom(await call(guardianPassword, '/api/guardian/password', {
      method: 'PUT', cookie: first, body: { currentPassword: added.slip.startingPassword, newPassword: 'my-own-secret-1' },
    }));
    const view = (await (await call(children, '/api/guardian/children', { cookie: father })).json()) as GuardianChildren;
    expect(view.children[0].homework[0].comments.map((note) => note.body)).toEqual([comment.body]);

    const { rows } = await getPool().query("SELECT action, metadata FROM audit_logs WHERE action = 'homework.comment_added'");
    expect(rows).toEqual([{ action: 'homework.comment_added', metadata: { commentId: comment.id, studentId: pupils.aisyah } }]);
    expect(JSON.stringify(rows)).not.toContain('Bagus');
  });

  it('a hidden comment leaves the pupil\'s view but stays for the teacher; it cannot be hidden twice', async () => {
    const comment = (await (await write({ studentId: pupils.aisyah, body: 'Salah tulis' })).json()) as HomeworkComment;
    const hide = () => call(hideComment, `${comments(homework.id)}/${comment.id}`, {
      params: { id: homework.id, commentId: comment.id }, method: 'PATCH', cookie: guru, body: { hidden: true },
    });
    expect((await hide()).status).toBe(204);
    expect((await hide()).status).toBe(404);
    expect(await notesFor(await pupilSignIn(0))).toEqual([]);

    const listed = await call(listComments, comments(homework.id), { params: { id: homework.id }, cookie: guru });
    const list = (await listed.json()) as HomeworkComments;
    expect(list.comments).toMatchObject([{ id: comment.id, hidden: true }]);
    const { rows } = await getPool().query('SELECT count(*)::int AS total FROM homework_comments');
    expect(rows[0].total).toBe(1);
  });

  it('lists every comment on the homework to the setter, beyond 200, so the newest can still be hidden', async () => {
    // As if a large class had had several notes each: written straight to the table, past the per-pupil check.
    await getPool().query(
      `INSERT INTO homework_comments (school_id, homework_id, student_id, author_id, body, created_at)
       SELECT h.school_id, h.id, $2, h.set_by, 'Nota ' || n, $3::timestamptz + n * interval '1 second'
         FROM homework h, generate_series(1, 250) AS n WHERE h.id = $1`,
      [homework.id, pupils.aisyah, NOW],
    );
    const listed = await call(listComments, comments(homework.id), { params: { id: homework.id }, cookie: guru });
    const list = (await listed.json()) as HomeworkComments;
    expect(list.comments).toHaveLength(250);
    expect(list.comments.at(-1)?.body).toBe('Nota 250');
  });

  it('closes the class list and the notes to a setter who no longer teaches the class', async () => {
    const handIns = `/api/homework/${homework.id}/hand-ins`;
    expect((await call(listHandIns, handIns, { params: { id: homework.id }, cookie: guru })).status).toBe(200);
    // The timetable changes hands: guru no longer teaches 4 Bestari.
    await getPool().query("DELETE FROM timetable_slots WHERE teacher_id = (SELECT id FROM users WHERE email = 'guru@a.test')");

    expect((await call(listHandIns, handIns, { params: { id: homework.id }, cookie: guru })).status).toBe(404);
    expect((await call(tickHandIn, `${handIns}/${pupils.aisyah}`, {
      params: { id: homework.id, studentId: pupils.aisyah }, method: 'PUT', cookie: guru, body: { handedIn: true },
    })).status).toBe(404);
    expect((await call(listComments, comments(homework.id), { params: { id: homework.id }, cookie: guru })).status).toBe(404);
    expect((await write({ studentId: pupils.aisyah, body: 'Hai' })).status).toBe(404);
  });

  it('refuses anyone but the setter, a pupil outside the class, long or MyKad-like text, and an eleventh note', async () => {
    const lain = await staffSignIn('lain@a.test');
    expect((await write({ studentId: pupils.aisyah, body: 'Hai' }, lain)).status).toBe(404);
    expect((await write({ studentId: pupils.aisyah, body: 'Hai' }, admin)).status).toBe(404);
    expect((await call(listComments, comments(homework.id), { params: { id: homework.id }, cookie: lain })).status).toBe(404);

    const fieldsOf = async (response: Response) => ((await response.json()) as { error: { fields: Record<string, string> } }).error.fields;
    expect(await fieldsOf(await write({ studentId: '00000000-0000-4000-8000-000000000000', body: 'Hai' }))).toEqual({ studentId: 'invalid_student' });
    expect(await fieldsOf(await write({ studentId: pupils.aisyah, body: 'x'.repeat(301) }))).toEqual({ body: 'too_long' });
    expect(await fieldsOf(await write({ studentId: pupils.aisyah, body: 'Nombor ibu 850101-14-5566' }))).toEqual({ body: 'looks_like_mykad' });
    expect(await fieldsOf(await write({ studentId: pupils.aisyah, body: '   ' }))).toEqual({ body: 'required' });

    for (let note = 1; note <= 10; note += 1) expect((await write({ studentId: pupils.aisyah, body: `Nota ${note}` })).status).toBe(201);
    expect(await fieldsOf(await write({ studentId: pupils.aisyah, body: 'Nota 11' }))).toEqual({ body: 'too_many_comments' });
  });

  it('keeps to ten notes per pupil when another is being saved at the same moment', async () => {
    for (let note = 1; note <= 9; note += 1) expect((await write({ studentId: pupils.aisyah, body: `Nota ${note}` })).status).toBe(201);
    // Another request holds the homework and has written the tenth note, not yet committed.
    const response = await raceAgainstOpenTransaction(async (client) => {
      await lockHomework(client, school, homework.id);
      await client.query(
        `INSERT INTO homework_comments (school_id, homework_id, student_id, author_id, body)
         SELECT school_id, id, $2, set_by, 'Nota 10' FROM homework WHERE id = $1`,
        [homework.id, pupils.aisyah],
      );
    }, () => write({ studentId: pupils.aisyah, body: 'Nota 11' }));
    expect(response.status).toBe(400);
    const { rows } = await getPool().query('SELECT count(*)::int AS total FROM homework_comments WHERE student_id = $1', [pupils.aisyah]);
    expect(rows[0].total).toBe(10);
  });
});
