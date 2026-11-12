import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { PATCH as patchSettings } from '@/app/api/me/notifications/route';
import { DELETE as cancelRelief } from '@/app/api/relief/[id]/route';
import { POST as assignRelief } from '@/app/api/relief/route';
import { PATCH as answerRequest } from '@/app/api/tasks/[id]/extension-requests/[requestId]/route';
import { POST as askForTime } from '@/app/api/tasks/[id]/extension-requests/route';
import { POST as createTask } from '@/app/api/tasks/route';
import { POST as addSlot } from '@/app/api/timetable/slots/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import type { ExtensionRequest } from '@/features/extensions/interfaces/extension.interface';
import type { ReliefAssigned } from '@/features/relief/interfaces/relief.interface';
import type { TaskDetail } from '@/features/tasks/interfaces/task.interface';
import type { TimetableSlot } from '@/features/timetable/interfaces/timetable.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import {
  call, clearQueuedJobs, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD,
} from '@/shared/server/testing/api-test-kit';
import type { EventNoticeJob } from '../interfaces/event-notice.interface';
import type { EmailMessage, NotificationSenders } from '../interfaces/notification.interface';
import { notifyEvent } from './notify-event.service';
import { SendFailure } from './send-failure';

/** Malaysia time. 2 November 2026 is a Monday; working hours are 07:30 to 17:00, Monday to Friday. */
const myt = (local: string) => new Date(`${local}:00+08:00`);
const at = (local: string) => setTestClock(fixedClock(myt(local)));
const MONDAY = '2026-11-02';
const TUESDAY = '2026-11-03';
const WEDNESDAY = '2026-11-04';

const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

/** Records the emails that would have gone out; push is off. A test can make the next email fail. */
function fakeSenders() {
  const emails: EmailMessage[] = [];
  const failNext: SendFailure[] = [];
  const senders: NotificationSenders = {
    email: {
      async send(message) {
        const failure = failNext.shift();
        if (failure) throw failure;
        emails.push(message);
      },
    },
    push: null,
  };
  return { senders, emails, failNext };
}

interface QueuedNotice {
  data: EventNoticeJob;
  startAfter: string;
}

const queuedNotices = async (): Promise<QueuedNotice[]> => {
  const { rows } = await getPool().query<{ data: EventNoticeJob; start_after: Date }>(
    `SELECT data, start_after FROM pgboss.job WHERE name = 'notify-event' ORDER BY created_on, id`,
  );
  return rows.map((row) => ({ data: row.data, startAfter: row.start_after.toISOString() }));
};

describe('extension and relief notifications (Phase 2)', () => {
  let schoolB: string;
  let guru: string;
  let ali: string;
  let sender: string;
  let teacher: string;
  let admin: string;
  /** Guru's Wednesday 08:00 to 09:00 lesson: the period that needs relief. */
  let lesson: TimetableSlot;

  const run = (job: EventNoticeJob, local: string, fake = fakeSenders()) =>
    notifyEvent(job, fixedClock(myt(local)), fake.senders, 'https://sapientia.test').then((result) => ({ result, emails: fake.emails }));

  /** Sends a task to guru now; guru asks for a later date, at askAt if given (after the task has reached them). */
  const askForLaterDate = async (askAt?: string) => {
    const created = await call(createTask, '/api/tasks', {
      method: 'POST', cookie: sender, body: { title: 'Analisis item PPT', dueOn: TUESDAY, assigneeIds: [guru] },
    });
    const task = (await created.json()) as TaskDetail;
    if (askAt) await moveTo(askAt);
    const asked = await call(askForTime, `/api/tasks/${task.id}/extension-requests`, {
      method: 'POST', cookie: teacher, body: { requestedDueOn: WEDNESDAY, reason: 'Mesyuarat PIBG' }, params: { id: task.id },
    });
    expect(asked.status).toBe(201);
    return { task, request: (await asked.json()) as ExtensionRequest };
  };

  const giveRelief = async () => {
    const response = await call(assignRelief, '/api/relief', {
      method: 'POST', cookie: admin, body: { slotId: lesson.id, onDate: WEDNESDAY, reliefTeacherId: ali },
    });
    expect(response.status).toBe(201);
    return (await response.json()) as ReliefAssigned;
  };

  /** Moves the clock and signs everyone in again: a jump of hours leaves the old sessions idle. */
  const moveTo = async (local: string) => {
    at(local);
    [admin, sender, teacher] = await Promise.all([signIn('admin@a.test'), signIn('pk@a.test'), signIn('guru@a.test')]);
  };

  const cancel = (reliefId: string) =>
    call(cancelRelief, `/api/relief/${reliefId}`, { method: 'DELETE', cookie: admin, params: { id: reliefId } });

  beforeEach(async () => {
    at(`${MONDAY}T10:00`);
    await resetDatabase();
    await clearQueuedJobs();
    const schoolA = await createSchool('A001');
    schoolB = await createSchool('B001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    await createUser(schoolA, 'pk@a.test', 'sender');
    guru = await createUser(schoolA, 'guru@a.test', 'teacher');
    ali = await createUser(schoolA, 'ali@a.test', 'teacher');
    admin = await signIn('admin@a.test');
    sender = await signIn('pk@a.test');
    teacher = await signIn('guru@a.test');
    const slot = await call(addSlot, '/api/timetable/slots', {
      method: 'POST', cookie: admin, body: { teacherId: guru, weekday: 3, startTime: '08:00', endTime: '09:00', label: '4 Bestari' },
    });
    lesson = (await slot.json()) as TimetableSlot;
  });

  afterEach(() => setTestClock(null));

  afterAll(async () => {
    await closeQueue();
    await closePool();
  });

  describe('extension requests', () => {
    it('tells the sender of a request once, with the dates and a link, but never the reason', async () => {
      const { task, request } = await askForLaterDate();
      const [queued] = await queuedNotices();
      expect(queued).toEqual({
        data: { kind: 'extension.requested', schoolId: expect.any(String), extensionId: request.id },
        startAfter: myt(`${MONDAY}T10:00`).toISOString(),
      });

      const { result, emails } = await run(queued.data, `${MONDAY}T10:01`);
      expect(result).toEqual({ sent: 1, failed: 0 });
      expect(emails[0].to).toBe('pk@a.test');
      expect(emails[0].text).toContain('guru meminta tarikh akhir yang lebih lewat');
      expect(emails[0].text).toContain('Tarikh yang diminta: Rabu, 4 November 2026');
      expect(emails[0].text).toContain(`https://sapientia.test/staff/tasks/${task.id}`);
      expect(emails[0].text).not.toContain('PIBG');

      // The job running again sends nothing more.
      expect((await run(queued.data, `${MONDAY}T10:02`)).result).toEqual({ sent: 0, failed: 0 });
    });

    it('holds a request made in the evening until the next working start', async () => {
      const { request } = await askForLaterDate(`${MONDAY}T20:00`);
      const notices = await queuedNotices();
      expect(notices.find((notice) => notice.data.kind === 'extension.requested')).toEqual({
        data: { kind: 'extension.requested', schoolId: expect.any(String), extensionId: request.id },
        startAfter: myt(`${TUESDAY}T07:30`).toISOString(),
      });
    });

    it('tells the teacher the answer, and drops the request notice if it was answered before it went out', async () => {
      const { task, request } = await askForLaterDate();
      const answered = await call(answerRequest, `/api/tasks/${task.id}/extension-requests/${request.id}`, {
        method: 'PATCH', cookie: sender, body: { decision: 'propose', dueOn: '2026-11-05' }, params: { id: task.id, requestId: request.id },
      });
      expect(answered.status).toBe(200);
      const [asked, answer] = await queuedNotices();
      expect(answer.data).toEqual({ kind: 'extension.answered', schoolId: expect.any(String), extensionId: request.id });

      expect(await run(asked.data, `${MONDAY}T10:05`)).toEqual({ result: { sent: 0, failed: 0 }, emails: [] });
      const { emails } = await run(answer.data, `${MONDAY}T10:05`);
      expect(emails.map((email) => email.to)).toEqual(['guru@a.test']);
      expect(emails[0].subject).toBe('Tarikh akhir baharu / New due date: Analisis item PPT');
      expect(emails[0].text).toContain('Tarikh akhir baharu anda: Khamis, 5 November 2026');
    });

    it('retries only what failed, and honours the email switch', async () => {
      const { request } = await askForLaterDate();
      const job: EventNoticeJob = { kind: 'extension.requested', schoolId: (await queuedNotices())[0].data.schoolId, extensionId: request.id };
      const failing = fakeSenders();
      failing.failNext.push(new SendFailure('temporary', 'email: ECONNECTION'));
      expect((await run(job, `${MONDAY}T10:01`, failing)).result).toEqual({ sent: 0, failed: 1 });
      expect((await run(job, `${MONDAY}T10:05`)).result).toEqual({ sent: 1, failed: 0 });

      await call(patchSettings, '/api/me/notifications', { method: 'PATCH', cookie: sender, body: { email: false } });
      await getPool().query('DELETE FROM event_notice_sends');
      expect((await run(job, `${MONDAY}T10:10`)).emails).toEqual([]);
    });
  });

  describe('relief', () => {
    it('tells the relief teacher at the delivery time of the relief, with the class, date and time', async () => {
      await moveTo(`${MONDAY}T21:00`);
      const relief = await giveRelief();
      expect(relief.held).toBe(true);
      const [queued] = await queuedNotices();
      expect(queued).toEqual({
        data: { kind: 'relief.assigned', schoolId: expect.any(String), reliefId: relief.id },
        startAfter: myt(`${TUESDAY}T07:30`).toISOString(),
      });

      const { emails } = await run(queued.data, `${TUESDAY}T07:30`);
      expect(emails.map((email) => email.to)).toEqual(['ali@a.test']);
      expect(emails[0].text).toContain('Anda diminta mengganti kelas guru.');
      expect(emails[0].text).toContain('Tarikh: Rabu, 4 November 2026');
      expect(emails[0].text).toContain('Masa: 08:00 hingga 09:00');
      expect(emails[0].text).toContain('Kelas: 4 Bestari');
      expect(emails[0].text).toContain('https://sapientia.test/staff/relief');
    });

    it('says nothing about a relief cancelled before its teacher was told', async () => {
      await moveTo(`${MONDAY}T21:00`);
      const relief = await giveRelief();
      expect((await cancel(relief.id)).status).toBe(204);
      const notices = await queuedNotices();
      expect(notices.map((notice) => notice.data.kind)).toEqual(['relief.assigned']);
      expect(await run(notices[0].data, `${TUESDAY}T07:30`)).toEqual({ result: { sent: 0, failed: 0 }, emails: [] });
    });

    it('tells a relief teacher who already knew that the class is cancelled, in working hours', async () => {
      const relief = await giveRelief();
      expect(relief.held).toBe(false);
      await moveTo(`${MONDAY}T18:00`);
      expect((await cancel(relief.id)).status).toBe(204);
      const cancelled = (await queuedNotices()).find((notice) => notice.data.kind === 'relief.cancelled');
      expect(cancelled).toEqual({
        data: {
          kind: 'relief.cancelled', schoolId: expect.any(String), reliefId: relief.id, reliefTeacherId: ali, absentTeacherId: guru,
          onDate: WEDNESDAY, startTime: '08:00', endTime: '09:00',
        },
        startAfter: myt(`${TUESDAY}T07:30`).toISOString(),
      });
      const { emails } = await run(cancelled?.data as EventNoticeJob, `${TUESDAY}T07:30`);
      expect(emails[0].to).toBe('ali@a.test');
      expect(emails[0].subject).toBe('Kelas ganti dibatalkan / Relief class cancelled');
    });

    it('sends nothing to a disabled account, or for a job naming another school', async () => {
      const relief = await giveRelief();
      const [queued] = await queuedNotices();
      expect(await run({ kind: 'relief.assigned', schoolId: schoolB, reliefId: relief.id }, `${MONDAY}T10:01`))
        .toEqual({ result: { sent: 0, failed: 0 }, emails: [] });
      await getPool().query(`UPDATE users SET status = 'disabled' WHERE id = $1`, [ali]);
      expect((await run(queued.data, `${MONDAY}T10:01`)).emails).toEqual([]);
    });
  });
});
