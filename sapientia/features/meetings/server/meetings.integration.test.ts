import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as guardianLogin } from '@/app/api/auth/guardian-login/route';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as childMeetings, POST as askForMeeting } from '@/app/api/guardian/children/[linkId]/meetings/route';
import { GET as children } from '@/app/api/guardian/children/route';
import { POST as refuse } from '@/app/api/guardian/links/[linkId]/refusal/route';
import { POST as withdraw } from '@/app/api/guardian/meetings/[id]/withdrawal/route';
import { PUT as guardianPassword } from '@/app/api/guardian/password/route';
import { PATCH as removeLink } from '@/app/api/guardians/[id]/links/[linkId]/route';
import { PATCH as updateGuardian } from '@/app/api/guardians/[id]/route';
import { GET as summaryOf } from '@/app/api/guardians/[id]/summary/route';
import { POST as addGuardian } from '@/app/api/guardians/route';
import { PUT as setHandIn } from '@/app/api/homework/[id]/hand-ins/[studentId]/route';
import { POST as setHomework } from '@/app/api/homework/route';
import { PATCH as answer } from '@/app/api/meetings/[id]/route';
import { GET as myMeetings } from '@/app/api/meetings/route';
import { PATCH as updateStudent } from '@/app/api/students/[id]/route';
import { POST as addStudents } from '@/app/api/students/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import type { AddGuardianResult, GuardianChildren, GuardianSummary } from '@/features/guardians/interfaces/guardian.interface';
import type { Homework } from '@/features/homework/interfaces/homework.interface';
import type { EventNoticeJob } from '@/features/notifications/interfaces/event-notice.interface';
import type { EmailMessage } from '@/features/notifications/interfaces/notification.interface';
import { notifyEvent } from '@/features/notifications/server/notify-event.service';
import type { AddStudentsResult } from '@/features/students/interfaces/student.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import {
  call, clearQueuedJobs, cookieFrom, createSchool, createUser, errorCode, resetDatabase, TEST_PASSWORD,
} from '@/shared/server/testing/api-test-kit';
import type { ChildMeetings, GuardianMeeting, TeacherMeeting, TeacherMeetings } from '../interfaces/meeting.interface';

/** Malaysia time (UTC+8). 22 March 2027 is a Monday; working hours are 07:30 to 17:00, Monday to Friday. */
const myt = (local: string) => new Date(`${local}:00+08:00`);
const at = (local: string) => setTestClock(fixedClock(myt(local)));
const OWN_PASSWORD = 'my-own-secret-1';

const staffSignIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

async function insertRow(sql: string, values: unknown[]): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(`${sql} RETURNING id`, values);
  return rows[0].id;
}

const queuedNotices = async () => {
  const { rows } = await getPool().query<{ data: EventNoticeJob; start_after: Date }>(
    `SELECT data, start_after FROM pgboss.job WHERE name = 'notify-event' ORDER BY created_on, id`,
  );
  return rows.map((row) => ({ data: row.data, startAfter: row.start_after.toISOString() }));
};

describe('meeting requests and the printed summary (Sprint 13, part 2)', () => {
  let schoolA: string;
  let classA: string;
  let maths: string;
  let teacherIds: { guru: string; cikgu2: string; cikgu3: string; cikgu4: string; lain: string };
  let admin: string;
  let guru: string;
  let pupils: { aisyah: string; daniel: string };

  /** Adds a guardian for a pupil and signs them in with their own password; returns the cookie and the link's id. */
  const activeGuardian = async (studentId: string, name: string) => {
    const response = await call(addGuardian, '/api/guardians', { method: 'POST', cookie: admin, body: { name, studentId, relationship: 'mother' } });
    const added = (await response.json()) as AddGuardianResult;
    const first = cookieFrom(await call(guardianLogin, '/api/auth/guardian-login', {
      method: 'POST', body: { username: added.slip.username, password: added.slip.startingPassword },
    }));
    const changed = await call(guardianPassword, '/api/guardian/password', {
      method: 'PUT', cookie: first, body: { currentPassword: added.slip.startingPassword, newPassword: OWN_PASSWORD },
    });
    const cookie = cookieFrom(changed);
    const kids = (await (await call(children, '/api/guardian/children', { cookie })).json()) as GuardianChildren;
    return { id: added.guardian.id, cookie, linkId: kids.children[0].linkId, username: added.slip.username };
  };

  const ask = (guardian: { cookie: string; linkId: string }, teacherId: string, topic = 'homework') =>
    call(askForMeeting, `/api/guardian/children/${guardian.linkId}/meetings`, {
      params: { linkId: guardian.linkId }, method: 'POST', cookie: guardian.cookie, body: { teacherId, topic, timeOfDay: 'afternoon' },
    });
  const askOk = async (guardian: { cookie: string; linkId: string }, teacherId = teacherIds.guru) => {
    const response = await ask(guardian, teacherId);
    expect(response.status).toBe(201);
    return (await response.json()) as GuardianMeeting;
  };
  const listFor = async (cookie: string) => (await (await call(myMeetings, '/api/meetings', { cookie })).json()) as TeacherMeetings;
  const answerAs = (cookie: string, id: string, body: Record<string, unknown>) =>
    call(answer, `/api/meetings/${id}`, { params: { id }, method: 'PATCH', cookie, body });
  /** Moves the clock; sessions idle out after an hour, so everyone used afterwards signs in again. */
  const later = async (local: string) => {
    at(local);
    admin = await staffSignIn('admin@a.test');
    guru = await staffSignIn('guru@a.test');
  };
  const guardianView = async (guardian: { cookie: string; linkId: string }) =>
    (await (await call(childMeetings, `/api/guardian/children/${guardian.linkId}/meetings`, {
      params: { linkId: guardian.linkId }, cookie: guardian.cookie,
    })).json()) as ChildMeetings;

  beforeEach(async () => {
    at('2027-03-22T09:00');
    await resetDatabase();
    await clearQueuedJobs();
    schoolA = await createSchool('A001');
    const schoolB = await createSchool('B001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    teacherIds = {
      guru: await createUser(schoolA, 'guru@a.test', 'teacher'),
      cikgu2: await createUser(schoolA, 'cikgu2@a.test', 'teacher'),
      cikgu3: await createUser(schoolA, 'cikgu3@a.test', 'sender'),
      cikgu4: await createUser(schoolA, 'cikgu4@a.test', 'teacher'),
      lain: await createUser(schoolA, 'lain@a.test', 'teacher'),
    };
    await createUser(schoolB, 'admin@b.test', 'admin');
    classA = await insertRow('INSERT INTO classes (school_id, name) VALUES ($1, $2)', [schoolA, '4 Bestari']);
    maths = await insertRow('INSERT INTO subjects (school_id, name) VALUES ($1, $2)', [schoolA, 'Matematik']);
    // Four teachers teach 4 Bestari; "lain" teaches no class at all.
    for (const [index, teacherId] of [teacherIds.guru, teacherIds.cikgu2, teacherIds.cikgu3, teacherIds.cikgu4].entries()) {
      await insertRow(
        `INSERT INTO timetable_slots (school_id, teacher_id, weekday, start_time, end_time, class_id, subject_id)
         VALUES ($1, $2, $3, '10:00', '11:00', $4, $5)`,
        [schoolA, teacherId, index + 1, classA, maths],
      );
    }
    admin = await staffSignIn('admin@a.test');
    guru = await staffSignIn('guru@a.test');
    const added = (await (await call(addStudents, '/api/students', {
      method: 'POST', cookie: admin, body: { classId: classA, students: [{ name: 'Aisyah binti Rahman' }, { name: 'Daniel Lee' }] },
    })).json()) as AddStudentsResult;
    pupils = { aisyah: added.students[0].id, daniel: added.students[1].id };
  });

  afterEach(() => setTestClock(null));
  afterAll(async () => {
    await closeQueue();
    await closePool();
  });

  it('a guardian asks a teacher of the class in working hours; the teacher sees the guardian\'s name only, and is told', async () => {
    const mother = await activeGuardian(pupils.aisyah, 'Salmah binti Yusof');
    const view = await guardianView(mother);
    expect(view.teachers).toEqual([
      { id: teacherIds.cikgu2, name: 'cikgu2', subjects: ['Matematik'] },
      { id: teacherIds.cikgu3, name: 'cikgu3', subjects: ['Matematik'] },
      { id: teacherIds.cikgu4, name: 'cikgu4', subjects: ['Matematik'] },
      { id: teacherIds.guru, name: 'guru', subjects: ['Matematik'] },
    ]);

    const request = await askOk(mother);
    expect(request).toMatchObject({ teacherName: 'guru', topic: 'homework', timeOfDay: 'afternoon', status: 'pending', meetingAt: null });
    expect(request.deliverAt).toBe(myt('2027-03-22T09:00').toISOString());

    const list = await listFor(guru);
    expect(list.items).toEqual([{
      id: request.id, guardianName: 'Salmah binti Yusof', pupilName: 'Aisyah binti Rahman', className: '4 Bestari', topic: 'homework',
      timeOfDay: 'afternoon', status: 'pending', receivedAt: request.deliverAt, meetingAt: null, declineReason: null,
    }]);
    expect(JSON.stringify(list)).not.toMatch(/penjaga\.|mother|relationship/);

    // The notice goes now, and names no one.
    const [queued] = await queuedNotices();
    expect(queued).toEqual({ data: { kind: 'meeting.requested', schoolId: schoolA, meetingId: request.id }, startAfter: request.deliverAt });
    const emails: EmailMessage[] = [];
    const senders = { email: { send: async (message: EmailMessage) => void emails.push(message) }, push: null };
    expect(await notifyEvent(queued.data, fixedClock(myt('2027-03-22T09:01')), senders, 'https://sapientia.test')).toEqual({ sent: 1, failed: 0 });
    expect(emails[0]).toMatchObject({ to: 'guru@a.test', subject: 'Permintaan pertemuan / Meeting request' });
    expect(emails[0].text).toContain('https://sapientia.test/staff/meetings');
    expect(emails[0].text).not.toMatch(/Salmah|Aisyah|Bestari/);
  });

  it('a request made at night reaches the teacher at the next working start, not before', async () => {
    await later('2027-03-22T21:30');
    const mother = await activeGuardian(pupils.aisyah, 'Salmah binti Yusof');
    const request = await askOk(mother);
    const tuesdayStart = myt('2027-03-23T07:30').toISOString();
    expect(request.deliverAt).toBe(tuesdayStart);
    expect((await queuedNotices())[0].startAfter).toBe(tuesdayStart);

    expect((await listFor(guru)).items).toEqual([]);
    expect((await answerAs(guru, request.id, { answer: 'decline', reason: 'other' })).status).toBe(404);

    await later('2027-03-23T07:30');
    expect((await listFor(guru)).items.map((item) => item.id)).toEqual([request.id]);
  });

  it('refuses a teacher who does not teach the class, a second request to the same teacher, and more than three waiting', async () => {
    const mother = await activeGuardian(pupils.aisyah, 'Salmah binti Yusof');
    const notTeaching = await ask(mother, teacherIds.lain);
    expect(notTeaching.status).toBe(400);
    expect(((await notTeaching.json()) as { error: { fields: Record<string, string> } }).error.fields).toEqual({ teacherId: 'invalid_teacher' });

    await askOk(mother, teacherIds.guru);
    expect((await ask(mother, teacherIds.guru)).status).toBe(409);
    await askOk(mother, teacherIds.cikgu2);
    await askOk(mother, teacherIds.cikgu3);
    const fourth = await ask(mother, teacherIds.cikgu4);
    expect(fourth.status).toBe(400);
    expect(((await fourth.json()) as { error: { fields: Record<string, string> } }).error.fields).toEqual({ teacherId: 'too_many_meetings' });

    // Free text is refused: the body takes codes only.
    const withNote = await call(askForMeeting, `/api/guardian/children/${mother.linkId}/meetings`, {
      params: { linkId: mother.linkId }, method: 'POST', cookie: mother.cookie,
      body: { teacherId: teacherIds.cikgu4, topic: 'other', timeOfDay: 'any', note: 'about home' },
    });
    expect(withNote.status).toBe(400);
  });

  it('keeps each side to its own: other guardians, other teachers, staff and other schools get nothing', async () => {
    const mother = await activeGuardian(pupils.aisyah, 'Salmah binti Yusof');
    const other = await activeGuardian(pupils.daniel, 'Lee Wei Ming');
    const request = await askOk(mother);

    // Another guardian cannot read or use this link, nor withdraw this request.
    const foreign = await call(childMeetings, `/api/guardian/children/${mother.linkId}/meetings`, { params: { linkId: mother.linkId }, cookie: other.cookie });
    expect(foreign.status).toBe(404);
    expect((await ask({ cookie: other.cookie, linkId: mother.linkId }, teacherIds.guru)).status).toBe(404);
    expect((await call(withdraw, `/api/guardian/meetings/${request.id}/withdrawal`, {
      params: { id: request.id }, method: 'POST', cookie: other.cookie,
    })).status).toBe(404);

    // Only the teacher asked sees and answers it; staff sessions do not open guardian routes, nor the other way round.
    const cikgu2 = await staffSignIn('cikgu2@a.test');
    expect((await listFor(cikgu2)).items).toEqual([]);
    expect((await answerAs(cikgu2, request.id, { answer: 'decline', reason: 'other' })).status).toBe(404);
    expect((await answerAs(admin, request.id, { answer: 'decline', reason: 'other' })).status).toBe(404);
    expect((await call(childMeetings, `/api/guardian/children/${mother.linkId}/meetings`, { params: { linkId: mother.linkId }, cookie: guru })).status)
      .toBe(401);
    expect((await call(myMeetings, '/api/meetings', { cookie: mother.cookie })).status).toBe(401);
    const otherSchool = await staffSignIn('admin@b.test');
    expect((await answerAs(otherSchool, request.id, { answer: 'decline', reason: 'other' })).status).toBe(404);
  });

  it('the teacher accepts with a time inside working hours, or declines with a reason; the guardian sees the answer', async () => {
    const mother = await activeGuardian(pupils.aisyah, 'Salmah binti Yusof');
    const other = await activeGuardian(pupils.daniel, 'Lee Wei Ming');
    const first = await askOk(mother);
    const second = await askOk(other);

    const evening = await answerAs(guru, first.id, { answer: 'accept', date: '2027-03-24', time: '18:00' });
    expect(evening.status).toBe(400);
    expect(((await evening.json()) as { error: { fields: Record<string, string> } }).error.fields).toEqual({ time: 'meeting_outside_hours' });
    expect((await answerAs(guru, first.id, { answer: 'accept', date: '2027-03-20', time: '10:00' })).status).toBe(400);
    expect((await answerAs(guru, first.id, { answer: 'maybe' })).status).toBe(400);

    const accepted = await answerAs(guru, first.id, { answer: 'accept', date: '2027-03-24', time: '14:00' });
    expect(accepted.status).toBe(200);
    expect(((await accepted.json()) as TeacherMeeting)).toMatchObject({ status: 'accepted', meetingAt: myt('2027-03-24T14:00').toISOString() });
    const again = await answerAs(guru, first.id, { answer: 'decline', reason: 'other' });
    expect(again.status).toBe(409);

    expect((await answerAs(guru, second.id, { answer: 'decline', reason: 'see_other_teacher' })).status).toBe(200);
    expect((await guardianView(mother)).requests).toMatchObject([{ id: first.id, status: 'accepted', meetingAt: myt('2027-03-24T14:00').toISOString() }]);
    expect((await guardianView(other)).requests).toMatchObject([{ id: second.id, status: 'declined', declineReason: 'see_other_teacher' }]);

    const { rows } = await getPool().query("SELECT action, metadata FROM audit_logs WHERE entity_type = 'meeting' ORDER BY id");
    expect(rows.map((row) => row.action)).toEqual(['meeting.requested', 'meeting.requested', 'meeting.accepted', 'meeting.declined']);
    expect(JSON.stringify(rows)).not.toMatch(/Salmah|Aisyah|Lee/);
  });

  it('a withdrawn request, or one whose link the guardian refuses, closes and is never told to the teacher', async () => {
    await later('2027-03-22T22:00');
    const mother = await activeGuardian(pupils.aisyah, 'Salmah binti Yusof');
    const withdrawn = await askOk(mother, teacherIds.guru);
    const cancelled = await askOk(mother, teacherIds.cikgu2);

    const response = await call(withdraw, `/api/guardian/meetings/${withdrawn.id}/withdrawal`, {
      params: { id: withdrawn.id }, method: 'POST', cookie: mother.cookie,
    });
    expect(response.status).toBe(204);
    expect((await call(withdraw, `/api/guardian/meetings/${withdrawn.id}/withdrawal`, {
      params: { id: withdrawn.id }, method: 'POST', cookie: mother.cookie,
    })).status).toBe(404);
    expect((await call(refuse, `/api/guardian/links/${mother.linkId}/refusal`, {
      params: { linkId: mother.linkId }, method: 'POST', cookie: mother.cookie, body: { reason: 'not_my_child' },
    })).status).toBe(204);

    await later('2027-03-23T07:30');
    const senders = { email: { send: async () => undefined }, push: null };
    for (const { data } of await queuedNotices()) {
      expect(await notifyEvent(data, fixedClock(myt('2027-03-23T07:30')), senders, null)).toEqual({ sent: 0, failed: 0 });
    }
    expect((await listFor(guru)).items).toMatchObject([{ id: withdrawn.id, status: 'withdrawn' }]);
    const cikgu2 = await staffSignIn('cikgu2@a.test');
    expect((await listFor(cikgu2)).items).toMatchObject([{ id: cancelled.id, status: 'cancelled' }]);
  });

  describe('a request belongs to the link and ends with it', () => {
    const statusOf = async (id: string) => {
      const { rows } = await getPool().query<{ status: string; meeting_at: Date | null }>(
        'SELECT status, meeting_at FROM meeting_requests WHERE id = $1', [id],
      );
      return { status: rows[0].status, meetingAt: rows[0].meeting_at?.toISOString() ?? null };
    };
    /** A waiting request to guru, one accepted for Wednesday (cikgu2) and one accepted for this afternoon (cikgu3). */
    const threeRequests = async (guardian: { cookie: string; linkId: string }) => {
      const waiting = await askOk(guardian, teacherIds.guru);
      const future = await askOk(guardian, teacherIds.cikgu2);
      const today = await askOk(guardian, teacherIds.cikgu3);
      expect((await answerAs(await staffSignIn('cikgu2@a.test'), future.id, { answer: 'accept', date: '2027-03-24', time: '14:00' })).status)
        .toBe(200);
      expect((await answerAs(await staffSignIn('cikgu3@a.test'), today.id, { answer: 'accept', date: '2027-03-22', time: '14:00' })).status)
        .toBe(200);
      // The next morning: this afternoon's meeting has been held, Wednesday's is still to come.
      await later('2027-03-23T09:00');
      return { waiting: waiting.id, future: future.id, held: today.id };
    };
    const held = { status: 'accepted', meetingAt: myt('2027-03-22T14:00').toISOString() };
    const cancelled = { status: 'cancelled', meetingAt: null };

    it('cancels the waiting and the future accepted requests when the administrator removes the link, not one already held', async () => {
      const mother = await activeGuardian(pupils.aisyah, 'Salmah binti Yusof');
      const ids = await threeRequests(mother);
      expect((await call(removeLink, `/api/guardians/${mother.id}/links/${mother.linkId}`, {
        params: { id: mother.id, linkId: mother.linkId }, method: 'PATCH', cookie: admin, body: { reason: 'school_decision' },
      })).status).toBe(200);
      expect(await statusOf(ids.waiting)).toEqual(cancelled);
      expect(await statusOf(ids.future)).toEqual(cancelled);
      expect(await statusOf(ids.held)).toEqual(held);
    });

    it('cancels them when the guardian refuses the link', async () => {
      const mother = await activeGuardian(pupils.aisyah, 'Salmah binti Yusof');
      const ids = await threeRequests(mother);
      const cookie = cookieFrom(await call(guardianLogin, '/api/auth/guardian-login', {
        method: 'POST', body: { username: mother.username, password: OWN_PASSWORD },
      }));
      expect((await call(refuse, `/api/guardian/links/${mother.linkId}/refusal`, {
        params: { linkId: mother.linkId }, method: 'POST', cookie, body: { reason: 'not_my_child' },
      })).status).toBe(204);
      expect(await statusOf(ids.future)).toEqual(cancelled);
      expect(await statusOf(ids.held)).toEqual(held);
    });

    it('cancels them when the guardian is disabled, and leaves another guardian\'s alone', async () => {
      const mother = await activeGuardian(pupils.aisyah, 'Salmah binti Yusof');
      const ids = await threeRequests(mother);
      // Added after the clock moves on, so the father's session is fresh.
      const father = await activeGuardian(pupils.aisyah, 'Rahman bin Ismail');
      const fathers = await askOk(father, teacherIds.cikgu4);
      expect((await call(updateGuardian, `/api/guardians/${mother.id}`, {
        params: { id: mother.id }, method: 'PATCH', cookie: admin, body: { status: 'disabled' },
      })).status).toBe(200);
      expect(await statusOf(ids.waiting)).toEqual(cancelled);
      expect(await statusOf(ids.future)).toEqual(cancelled);
      expect(await statusOf(ids.held)).toEqual(held);
      expect((await statusOf(fathers.id)).status).toBe('pending');
    });

    it('on a class move, cancels those to teachers who do not teach the new class and keeps the rest', async () => {
      const mother = await activeGuardian(pupils.aisyah, 'Salmah binti Yusof');
      const ids = await threeRequests(mother);
      // guru also teaches 5 Cemerlang; cikgu2 does not.
      const classB = await insertRow('INSERT INTO classes (school_id, name) VALUES ($1, $2)', [schoolA, '5 Cemerlang']);
      await insertRow(
        `INSERT INTO timetable_slots (school_id, teacher_id, weekday, start_time, end_time, class_id, subject_id)
         VALUES ($1, $2, 5, '10:00', '11:00', $3, $4)`,
        [schoolA, teacherIds.guru, classB, maths],
      );
      expect((await call(updateStudent, `/api/students/${pupils.aisyah}`, {
        params: { id: pupils.aisyah }, method: 'PATCH', cookie: admin, body: { classId: classB },
      })).status).toBe(200);
      expect((await statusOf(ids.waiting)).status).toBe('pending');
      expect(await statusOf(ids.future)).toEqual(cancelled);
      expect(await statusOf(ids.held)).toEqual(held);
      const { rows } = await getPool().query("SELECT metadata FROM audit_logs WHERE action = 'student.updated'");
      expect(rows[0].metadata).toMatchObject({ classId: classB, meetingsCancelled: 1 });
    });
  });

  describe('the printed summary', () => {
    it('gives an administrator the linked children\'s class homework and week, with no hand-ins, and audits it', async () => {
      const mother = await activeGuardian(pupils.aisyah, 'Salmah binti Yusof');
      const homework = (await (await call(setHomework, '/api/homework', {
        method: 'POST', cookie: guru, body: { classId: classA, subjectId: maths, title: 'Latihan pecahan', dueOn: '2027-03-24' },
      })).json()) as Homework;
      await call(setHandIn, `/api/homework/${homework.id}/hand-ins/${pupils.aisyah}`, {
        params: { id: homework.id, studentId: pupils.aisyah }, method: 'PUT', cookie: guru, body: { handedIn: true },
      });

      const response = await call(summaryOf, `/api/guardians/${mother.id}/summary?weekOf=2027-03-29`, { params: { id: mother.id }, cookie: admin });
      expect(response.status).toBe(200);
      const summary = (await response.json()) as GuardianSummary;
      expect(summary).toMatchObject({
        guardianName: 'Salmah binti Yusof', schoolName: 'Sekolah A001', homeworkFrom: '2027-03-22', homeworkTo: '2027-04-05',
        children: [{ name: 'Aisyah binti Rahman', className: '4 Bestari' }],
      });
      const [child] = summary.children;
      expect(child.homework).toEqual([{
        id: homework.id, subjectName: 'Matematik', teacherName: 'guru', title: 'Latihan pecahan', details: null, dueOn: '2027-03-24',
      }]);
      expect(JSON.stringify(summary)).not.toMatch(/handedIn|hand_in/);
      expect(child.week.weekOf).toBe('2027-03-29');
      expect(child.week.days[0].lessons).toEqual([{ startTime: '10:00', endTime: '11:00', subjectName: 'Matematik', relief: false }]);

      const { rows } = await getPool().query("SELECT action, metadata FROM audit_logs WHERE action = 'guardian.summary_viewed'");
      expect(rows).toEqual([{ action: 'guardian.summary_viewed', metadata: { children: 1, weekOf: '2027-03-29' } }]);
    });

    it('is for administrators of the guardian\'s school only', async () => {
      const mother = await activeGuardian(pupils.aisyah, 'Salmah binti Yusof');
      const get = (cookie: string) => call(summaryOf, `/api/guardians/${mother.id}/summary`, { params: { id: mother.id }, cookie });
      expect((await get(guru)).status).toBe(404);
      expect(await errorCode(await get(await staffSignIn('admin@b.test')))).toBe('not_found');
      expect((await get(mother.cookie)).status).toBe(401);
    });
  });
});
