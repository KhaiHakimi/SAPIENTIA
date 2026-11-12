import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { PUT as putRecord } from '@/app/api/lessons/records/route';
import { GET as getDay } from '@/app/api/lessons/route';
import { POST as assignRelief } from '@/app/api/relief/route';
import { DELETE as removeSlot } from '@/app/api/timetable/slots/[id]/route';
import { POST as addSlot } from '@/app/api/timetable/slots/route';
import { closeQueue } from '@/features/delivery/server/delivery-queue.service';
import type { TimetableSlot } from '@/features/timetable/interfaces/timetable.interface';
import { fixedClock, setTestClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { call, cookieFrom, createSchool, createUser, resetDatabase, TEST_PASSWORD } from '@/shared/server/testing/api-test-kit';
import type { LessonDay, LessonRecord } from '../interfaces/lesson.interface';

/** Malaysia time. 4 November 2026 is a Wednesday; working hours are 07:30 to 17:00, Monday to Friday. */
const myt = (local: string) => new Date(`${local}:00+08:00`);
const WEDNESDAY = '2026-11-04';
const THURSDAY = '2026-11-05';
const MONDAY = '2026-11-02';

const signIn = async (email: string) =>
  cookieFrom(await call(login, '/api/auth/login', { method: 'POST', body: { email, password: TEST_PASSWORD } }));

describe('lesson records (Sprint 9)', () => {
  let guru: string;
  let admin: string;
  let teacher: string;
  let colleague: string;
  let outsider: string;
  let morning: TimetableSlot;
  let lateMorning: TimetableSlot;
  let monday: TimetableSlot;
  let thursday: TimetableSlot;
  let ali: string;

  const newSlot = async (weekday: number, startTime: string, endTime: string, label: string, teacherId = guru) => {
    const response = await call(addSlot, '/api/timetable/slots', {
      method: 'POST', cookie: admin, body: { teacherId, weekday, startTime, endTime, label },
    });
    expect(response.status).toBe(201);
    return (await response.json()) as TimetableSlot;
  };
  const day = async (onDate: string, cookie = teacher) =>
    (await (await call(getDay, `/api/lessons?onDate=${onDate}`, { cookie })).json()) as LessonDay;
  const record = (body: Record<string, unknown>, cookie = teacher) => call(putRecord, '/api/lessons/records', { method: 'PUT', cookie, body });
  const fieldsOf = async (response: Response) => ((await response.json()) as { error: { fields?: Record<string, string> } }).error.fields;
  /** Moves the clock and signs everyone in again: a jump of hours leaves the old sessions idle. */
  const moveTo = async (local: string) => {
    setTestClock(fixedClock(myt(local)));
    [admin, teacher, colleague] = await Promise.all([signIn('admin@a.test'), signIn('guru@a.test'), signIn('ali@a.test')]);
  };

  beforeEach(async () => {
    setTestClock(fixedClock(myt(`${WEDNESDAY}T10:00`)));
    await resetDatabase();
    const schoolA = await createSchool('A001');
    const schoolB = await createSchool('B001');
    await createUser(schoolA, 'admin@a.test', 'admin');
    guru = await createUser(schoolA, 'guru@a.test', 'teacher');
    ali = await createUser(schoolA, 'ali@a.test', 'teacher');
    await createUser(schoolB, 'guru@b.test', 'teacher');
    admin = await signIn('admin@a.test');
    teacher = await signIn('guru@a.test');
    colleague = await signIn('ali@a.test');
    outsider = await signIn('guru@b.test');
    morning = await newSlot(3, '08:00', '09:00', '4 Bestari');
    lateMorning = await newSlot(3, '11:00', '12:00', '5 Cerdik');
    monday = await newSlot(1, '08:00', '09:00', '3 Arif');
    thursday = await newSlot(4, '08:00', '09:00', '2 Bijak');
  });

  afterEach(() => setTestClock(null));

  afterAll(async () => {
    await closeQueue();
    await closePool();
  });

  it('lists my periods for the day, open to recording once each has started', async () => {
    const wednesday = await day(WEDNESDAY);
    expect(wednesday.recordable).toBe(true);
    expect(wednesday.periods.map((period) => [period.slot.label, period.kind, period.canRecord, period.record])).toEqual([
      ['4 Bestari', 'own', true, null],
      ['5 Cerdik', 'own', false, null],
    ]);
    // Nothing of mine is on a colleague's list.
    expect((await day(WEDNESDAY, colleague)).periods).toEqual([]);
    // Tomorrow is not open yet.
    expect((await day(THURSDAY)).recordable).toBe(false);
  });

  it('records a lesson in one tap, needs a reason when it was not held, and logs each change', async () => {
    const held = await record({ slotId: morning.id, onDate: WEDNESDAY, status: 'held' });
    expect(held.status).toBe(200);
    expect((await held.json()) as LessonRecord).toMatchObject({ status: 'held', reason: null, recordedBy: { id: guru } });

    const noReason = await record({ slotId: morning.id, onDate: WEDNESDAY, status: 'not_held' });
    expect(noReason.status).toBe(400);
    expect(await fieldsOf(noReason)).toEqual({ reason: 'reason_required' });

    const notHeld = await record({ slotId: morning.id, onDate: WEDNESDAY, status: 'not_held', reason: 'official_duty', note: '  Mesyuarat PPD  ' });
    expect(notHeld.status).toBe(200);
    const [period] = (await day(WEDNESDAY)).periods;
    expect(period.record).toMatchObject({ status: 'not_held', reason: 'official_duty', note: 'Mesyuarat PPD' });

    const { rows } = await getPool().query<{ metadata: Record<string, unknown> }>(
      `SELECT metadata FROM audit_logs WHERE action = 'lesson.recorded' ORDER BY created_at, id`,
    );
    expect(rows.map((row) => [row.metadata.status, row.metadata.changed])).toEqual([['held', false], ['not_held', true]]);
    // The note stays out of the audit log.
    expect(JSON.stringify(rows)).not.toContain('PPD');
  });

  it('accepts only a started period, on its own weekday, within 30 days', async () => {
    const notStarted = await record({ slotId: lateMorning.id, onDate: WEDNESDAY, status: 'held' });
    expect(await fieldsOf(notStarted)).toEqual({ onDate: 'not_started' });
    const wrongDay = await record({ slotId: monday.id, onDate: WEDNESDAY, status: 'held' });
    expect(await fieldsOf(wrongDay)).toEqual({ onDate: 'wrong_weekday' });
    expect((await record({ slotId: monday.id, onDate: MONDAY, status: 'held' })).status).toBe(200);
    // 30 days back is 5 October, a Monday; the Monday before is too old.
    expect((await record({ slotId: monday.id, onDate: '2026-10-05', status: 'held' })).status).toBe(200);
    const tooOld = await record({ slotId: monday.id, onDate: '2026-09-28', status: 'held' });
    expect(await fieldsOf(tooOld)).toEqual({ onDate: 'too_old' });
  });

  it('keeps only https e-RPH links', async () => {
    for (const erphUrl of ['javascript:alert(1)', 'http://erph.test/rph/1', 'data:text/html,hi']) {
      const refused = await record({ slotId: morning.id, onDate: WEDNESDAY, status: 'held', erphUrl });
      expect(refused.status, erphUrl).toBe(400);
      expect(await fieldsOf(refused)).toEqual({ erphUrl: 'invalid_url' });
    }
    const linked = await record({ slotId: morning.id, onDate: WEDNESDAY, status: 'held', erphUrl: 'https://erph.test/rph/1' });
    expect(((await linked.json()) as LessonRecord).erphUrl).toBe('https://erph.test/rph/1');
  });

  it('lets the relief teacher, not the absent teacher, record a covered class', async () => {
    const assigned = await call(assignRelief, '/api/relief', {
      method: 'POST', cookie: admin, body: { slotId: thursday.id, onDate: THURSDAY, reliefTeacherId: ali },
    });
    expect(assigned.status).toBe(201);
    await moveTo(`${THURSDAY}T09:30`);

    const mine = await day(THURSDAY);
    expect(mine.periods[0]).toMatchObject({ kind: 'own', coveredBy: { id: ali }, canRecord: false });
    expect((await record({ slotId: thursday.id, onDate: THURSDAY, status: 'held' })).status).toBe(404);

    const covering = await day(THURSDAY, colleague);
    expect(covering.periods[0]).toMatchObject({ kind: 'relief', absentTeacher: { id: guru }, canRecord: true });
    const recorded = await record({ slotId: thursday.id, onDate: THURSDAY, status: 'held' }, colleague);
    expect(recorded.status).toBe(200);
    expect(((await recorded.json()) as LessonRecord).recordedBy.id).toBe(ali);
  });

  it('refuses anyone else: a colleague, another school, or no sign-in', async () => {
    expect((await record({ slotId: morning.id, onDate: WEDNESDAY, status: 'held' }, colleague)).status).toBe(404);
    expect((await record({ slotId: morning.id, onDate: WEDNESDAY, status: 'held' }, outsider)).status).toBe(404);
    expect((await day(WEDNESDAY, outsider)).periods).toEqual([]);
    expect((await call(putRecord, '/api/lessons/records', { method: 'PUT', body: { slotId: morning.id, onDate: WEDNESDAY, status: 'held' } })).status)
      .toBe(401);
    expect((await record({ slotId: morning.id, onDate: WEDNESDAY, status: 'held', extra: true })).status).toBe(400);
  });

  it('keeps the record when the period is removed from the timetable', async () => {
    expect((await record({ slotId: morning.id, onDate: WEDNESDAY, status: 'held' })).status).toBe(200);
    const removed = await call(removeSlot, `/api/timetable/slots/${morning.id}`, { method: 'DELETE', cookie: admin, params: { id: morning.id } });
    expect(removed.status).toBe(204);
    const { rows } = await getPool().query('SELECT slot_id, label, start_time::text, status FROM lesson_records');
    expect(rows).toEqual([{ slot_id: null, label: '4 Bestari', start_time: '08:00:00', status: 'held' }]);
  });
});
