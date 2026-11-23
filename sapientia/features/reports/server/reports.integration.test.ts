import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as addHours } from '@/app/api/me/hours/route';
import { PUT as shareHours } from '@/app/api/me/hours/share/route';
import { GET as exportReport } from '@/app/api/reports/monthly/export/route';
import { GET as getReport } from '@/app/api/reports/monthly/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, errorCode, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import type { MonthlyReport } from '../interfaces/monthly-report.interface';

/**
 * Malaysia time, Friday 13 November 2026. October 2026 is the month reported on: the 1st is a Thursday, 22 weekdays, and
 * Monday 19 October is made a holiday below, leaving 21 working days. Working hours are the default 07:30 to 17:00.
 */
const NOW = '2026-11-13T10:00:00+08:00';
const myt = (local: string) => new Date(`${local}:00+08:00`);

const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

describe('monthly report (Sprint 10, G5)', () => {
  let schoolA: string;
  let adminId: string;
  let guru: string;
  let ali: string;
  let admin: string;
  let teacher: string;
  let outsider: string;
  let mathSlot: string;
  let scienceSlot: string;

  const db = () => getPool();
  const report = async (month: string, cookie = admin) => {
    const response = await call(getReport, `/api/reports/monthly?month=${month}`, { cookie });
    expect(response.status).toBe(200);
    return (await response.json()) as MonthlyReport;
  };

  /** Straight into the table, so a period can be dated before the month reported on. */
  async function insertSlot(
    teacherId: string,
    weekday: number,
    start: string,
    end: string,
    extra: { classId?: string; subjectId?: string; label?: string },
    createdAt: Date,
  ) {
    const { rows } = await db().query<{ id: string }>(
      `INSERT INTO timetable_slots (school_id, teacher_id, weekday, start_time, end_time, class_id, subject_id, label, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [schoolA, teacherId, weekday, start, end, extra.classId ?? null, extra.subjectId ?? null, extra.label ?? null, createdAt],
    );
    return rows[0].id;
  }

  async function insertRecord(
    slotId: string | null,
    onDate: string,
    status: 'held' | 'not_held',
    recordedBy: string,
    subject: string,
    reason: string | null = null,
  ) {
    await db().query(
      `INSERT INTO lesson_records (school_id, slot_id, on_date, scheduled_teacher_id, start_time, end_time, class_name, subject_name,
         recorded_by, status, reason, note)
       VALUES ($1, $2, $3, $4, '08:00', '09:00', '4 Bestari', $5, $6, $7, $8, 'Nota peribadi rekod')`,
      [schoolA, slotId, onDate, guru, subject, recordedBy, status, reason],
    );
  }

  async function insertTask(task: {
    createdAt: Date; dueOn: string; estimate: number | null; urgentReason?: string; flagged?: boolean;
  }) {
    const { rows } = await db().query<{ id: string }>(
      `INSERT INTO tasks (school_id, created_by, title, due_on, deliver_at, delivered_at, urgent, urgent_reason, estimated_minutes,
         deadline_flagged, created_at)
       VALUES ($1, $2, 'Tugasan', $3, $4, $4, $5, $6, $7, $8, $4) RETURNING id`,
      [
        schoolA, adminId, task.dueOn, task.createdAt, Boolean(task.urgentReason), task.urgentReason ?? null, task.estimate,
        task.flagged ?? false,
      ],
    );
    return rows[0].id;
  }

  async function assign(taskId: string, userId: string, done: Date | null, dueOn: string | null = null) {
    await db().query(
      `INSERT INTO task_assignments (school_id, task_id, user_id, status, completed_at, due_on) VALUES ($1, $2, $3, $4, $5, $6)`,
      [schoolA, taskId, userId, done ? 'done' : 'todo', done, dueOn],
    );
  }

  beforeEach(async () => {
    setTestClock(fixedClock(NOW));
    await resetDatabase();
    schoolA = await createSchool('A001', 'SK Taman Ilmu');
    const schoolB = await createSchool('B001');
    adminId = await createUser(schoolA, 'admin@a.test', 'admin');
    guru = await createUser(schoolA, 'guru@a.test', 'teacher');
    ali = await createUser(schoolA, 'ali@a.test', 'teacher');
    await createUser(schoolB, 'admin@b.test', 'admin');
    admin = await signIn('admin@a.test');
    teacher = await signIn('guru@a.test');
    outsider = await signIn('admin@b.test');

    const { rows: [maths] } = await db().query<{ id: string }>(`INSERT INTO subjects (school_id, name) VALUES ($1, 'Matematik') RETURNING id`, [schoolA]);
    const { rows: [science] } = await db().query<{ id: string }>(`INSERT INTO subjects (school_id, name) VALUES ($1, 'Sains') RETURNING id`, [schoolA]);
    const { rows: [klass] } = await db().query<{ id: string }>(`INSERT INTO classes (school_id, name) VALUES ($1, '4 Bestari') RETURNING id`, [schoolA]);
    await db().query(
      `INSERT INTO calendar_events (school_id, on_date, kind, title, created_by) VALUES ($1, '2026-10-19', 'holiday', 'Cuti', $2)`,
      [schoolA, adminId],
    );
    // Mondays 5, 12 and 26 October (the 19th is the holiday): three lessons.
    mathSlot = await insertSlot(guru, 1, '08:00', '09:00', { classId: klass.id, subjectId: maths.id }, myt('2026-09-01T08:00'));
    // Added on 14 October, so scheduled on Wednesdays 14, 21 and 28 only.
    scienceSlot = await insertSlot(guru, 3, '10:00', '11:00', { classId: klass.id, subjectId: science.id }, myt('2026-10-14T07:00'));
    // A duty is not a lesson.
    await insertSlot(guru, 5, '07:30', '08:00', { label: 'Bertugas pagi' }, myt('2026-09-01T08:00'));
    // Ali teaches too, so he counts as teaching staff.
    await insertSlot(ali, 2, '08:00', '09:00', { label: 'Perhimpunan' }, myt('2026-09-01T08:00'));
  });

  afterEach(() => setTestClock(null));

  afterAll(async () => {
    await closeQueue();
    await closePool();
  });

  it('refuses everyone but an administrator of the school, and checks the month', async () => {
    expect((await call(getReport, '/api/reports/monthly?month=2026-10')).status).toBe(401);
    expect((await call(getReport, '/api/reports/monthly?month=2026-10', { cookie: teacher })).status).toBe(404);
    expect((await call(exportReport, '/api/reports/monthly/export?month=2026-10&format=pdf&lang=ms', { cookie: teacher })).status).toBe(404);
    const future = await call(getReport, '/api/reports/monthly?month=2026-12', { cookie: admin });
    expect(future.status).toBe(400);
    expect(((await future.json()) as { error: { fields: Record<string, string> } }).error.fields).toEqual({ month: 'future_month' });
    expect(await errorCode(await call(getReport, '/api/reports/monthly?month=2026-13', { cookie: admin }))).toBe('validation');
    expect((await call(exportReport, '/api/reports/monthly/export?month=2026-10&format=docx&lang=ms', { cookie: admin })).status).toBe(400);
  });

  it('counts scheduled lessons against the records, by subject and reason, and the relief covered', async () => {
    await insertRecord(mathSlot, '2026-10-05', 'held', guru, 'Matematik');
    await insertRecord(mathSlot, '2026-10-12', 'not_held', guru, 'Matematik', 'official_duty');
    await insertRecord(scienceSlot, '2026-10-14', 'held', ali, 'Sains');
    // The period of this record has since been deleted; the record still counts.
    await insertRecord(null, '2026-10-08', 'held', guru, 'Sejarah');
    await db().query(
      `INSERT INTO relief_assignments (school_id, slot_id, on_date, absent_teacher_id, relief_teacher_id, start_time, end_time, deliver_at, created_by)
       VALUES ($1, $2, '2026-10-14', $3, $4, '10:00', '11:00', $5, $6), ($1, $2, '2026-11-04', $3, $4, '10:00', '11:00', $5, $6)`,
      [schoolA, scienceSlot, guru, ali, myt('2026-10-13T08:00'), adminId],
    );

    const october = await report('2026-10');
    expect(october.period).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(october.schoolName).toBe('SK Taman Ilmu');
    expect(october.lessons).toMatchObject({ scheduled: 7, held: 3, notHeld: 1, notRecorded: 3, relief: { arranged: 1, recordedHeld: 1 } });
    expect(october.lessons.reasons).toMatchObject({ official_duty: 1, leave: 0 });
    expect(october.lessons.bySubject).toEqual([
      { subject: 'Matematik', scheduled: 3, held: 1, notHeld: 1, notRecorded: 1 },
      { subject: 'Sains', scheduled: 3, held: 1, notHeld: 0, notRecorded: 2 },
      { subject: 'Sejarah', scheduled: 1, held: 1, notHeld: 0, notRecorded: 0 },
    ]);
    // Notes on records are never part of the report.
    expect(JSON.stringify(october)).not.toContain('Nota peribadi');
  });

  it('keeps last month\'s relief figures when the period is later removed from the timetable', async () => {
    await db().query(
      `INSERT INTO relief_assignments (school_id, slot_id, on_date, absent_teacher_id, relief_teacher_id, start_time, end_time, deliver_at, created_by)
       VALUES ($1, $2, '2026-10-05', $3, $4, '08:00', '09:00', $5, $6)`,
      [schoolA, mathSlot, guru, ali, myt('2026-10-02T08:00'), adminId],
    );
    await insertRecord(mathSlot, '2026-10-05', 'held', ali, 'Matematik');
    expect((await report('2026-10')).lessons.relief).toEqual({ arranged: 1, recordedHeld: 1 });

    await db().query('DELETE FROM timetable_slots WHERE id = $1', [mathSlot]);
    expect((await report('2026-10')).lessons.relief).toEqual({ arranged: 1, recordedHeld: 1 });
  });

  it('counts tasks by each assignee\'s own due date, with flagged deadlines, urgent sends and extensions', async () => {
    const onTime = await insertTask({ createdAt: myt('2026-10-02T09:00'), dueOn: '2026-10-09', estimate: 120 });
    await assign(onTime, guru, myt('2026-10-08T15:00'));
    await assign(onTime, ali, myt('2026-10-12T09:00'));
    const urgent = await insertTask({
      createdAt: myt('2026-10-10T21:00'), dueOn: '2026-10-30', estimate: 60, urgentReason: 'Arahan PPD sebelum 8 pagi', flagged: true,
    });
    await assign(urgent, guru, null);
    // Sent in September and due in October, but this assignee's date was extended into November: not due in October.
    const extended = await insertTask({ createdAt: myt('2026-09-28T09:00'), dueOn: '2026-10-03', estimate: 30 });
    await assign(extended, guru, null, '2026-11-05');
    await db().query(
      `INSERT INTO extension_requests (school_id, task_id, requested_by, current_due_on, requested_due_on, status, decided_by, decided_at,
         decided_due_on, created_at)
       VALUES ($1, $2, $3, '2026-10-03', '2026-11-05', 'approved', $4, $5, '2026-11-05', $5)`,
      [schoolA, extended, guru, adminId, myt('2026-10-01T10:00')],
    );

    const { tasks, wellbeing } = await report('2026-10');
    expect(tasks).toEqual({
      delivered: 2, due: 3, doneOnTime: 1, doneLate: 1, notDone: 1, flaggedDeadlines: 1,
      urgentOverrides: { count: 1, listed: [{ onDate: '2026-10-10', reason: 'Arahan PPD sebelum 8 pagi' }] },
      extensions: { requested: 1, approved: 1, countered: 0, pending: 0 },
    });
    // Two people teach: too few to show averages without pointing at them.
    expect(wellbeing).toMatchObject({
      teachingStaff: 2, workingDays: 21, averagesShown: false, averageFreeMinutesPerDay: null, flaggedDeadlines: 1, extensionRequests: 1,
    });
  });

  it('shows the wellbeing averages once enough people teach', async () => {
    for (const name of ['siti', 'kumar', 'mei']) {
      await insertSlot(await createUser(schoolA, `${name}@a.test`, 'teacher'), 4, '08:00', '09:00', { label: 'Kokurikulum' }, myt('2026-09-01T08:00'));
    }
    const task = await insertTask({ createdAt: myt('2026-10-02T09:00'), dueOn: '2026-10-09', estimate: 150 });
    await assign(task, guru, null);
    await assign(task, ali, null);

    const { wellbeing } = await report('2026-10');
    expect(wellbeing.teachingStaff).toBe(5);
    expect(wellbeing.averagesShown).toBe(true);
    // 300 estimated minutes due in October over five teachers.
    expect(wellbeing.averageTaskMinutes).toBe(60);
    // 5 teachers x 21 days x 570 minutes = 59,850, less periods: guru 3 Mondays x 60 + 4 Wednesdays x 60 + 5 Fridays x 30
    // = 570, Ali 4 Tuesdays x 60 = 240, the other three 5 Thursdays x 60 each = 900. 58,140 / 5 / 21 = 553.7.
    expect(wellbeing.averageFreeMinutesPerDay).toBe(554);
  });

  it('lists only the hours totals people chose to share, by name, never their entries', async () => {
    const colleague = await signIn('ali@a.test');
    await call(addHours, '/api/me/hours', { method: 'POST', cookie: teacher, body: { onDate: '2026-10-15', minutes: 90, kind: 'marking', note: 'Rahsia saya' } });
    await call(addHours, '/api/me/hours', { method: 'POST', cookie: colleague, body: { onDate: '2026-10-16', minutes: 45, kind: 'meetings' } });
    expect((await call(shareHours, '/api/me/hours/share', { method: 'PUT', cookie: teacher, body: { month: '2026-10' } })).status).toBe(200);

    const october = await report('2026-10');
    expect(october.sharedHours.map((share) => [share.name, share.minutes])).toEqual([['guru', 90]]);
    expect(JSON.stringify(october)).not.toContain('Rahsia saya');
    expect((await report('2026-11')).sharedHours).toEqual([]);
  });

  it('keeps each school to its own figures', async () => {
    await insertRecord(mathSlot, '2026-10-05', 'held', guru, 'Matematik');
    const other = await report('2026-10', outsider);
    expect(other.lessons.scheduled).toBe(0);
    expect(other.wellbeing.teachingStaff).toBe(0);
  });

  it('covers the current month up to yesterday', async () => {
    const november = await report('2026-11');
    expect(november.period).toEqual({ from: '2026-11-01', to: '2026-11-12' });
    // Mondays 2 and 9 November and Wednesdays 4 and 11 November.
    expect(november.lessons.scheduled).toBe(4);
  });

  it('exports PDF and Excel files, and records each export in the audit log', async () => {
    const pdf = await call(exportReport, '/api/reports/monthly/export?month=2026-10&format=pdf&lang=ms', { cookie: admin });
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get('content-type')).toBe('application/pdf');
    expect(pdf.headers.get('content-disposition')).toBe('attachment; filename="sapientia-laporan-bulanan-2026-10.pdf"');
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString('latin1')).toBe('%PDF-');

    const xlsx = await call(exportReport, '/api/reports/monthly/export?month=2026-10&format=xlsx&lang=en', { cookie: admin });
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers.get('content-disposition')).toBe('attachment; filename="sapientia-monthly-report-2026-10.xlsx"');
    expect(Buffer.from(await xlsx.arrayBuffer()).subarray(0, 2).toString('latin1')).toBe('PK');

    const { rows } = await db().query<{ actor_id: string; metadata: Record<string, string> }>(
      `SELECT actor_id, metadata FROM audit_logs WHERE school_id = $1 AND action = 'report.exported' ORDER BY id`,
      [schoolA],
    );
    expect(rows).toEqual([
      { actor_id: adminId, metadata: { month: '2026-10', format: 'pdf' } },
      { actor_id: adminId, metadata: { month: '2026-10', format: 'xlsx' } },
    ]);
  });
});
