import { describe, expect, it } from 'vitest';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import type { LessonRecordFact, ScheduledSlot } from '../interfaces/monthly-report.interface';
import { countLessons, reportPeriod, summariseWellbeing, workingDaysIn } from './monthly-report.service';

/** 07:30 to 17:00 is 570 working minutes a day. November 2026: the 2nd is a Monday; 21 weekdays in the month. */
const DAY = 570;
const calendar = (overrides: Partial<WorkingCalendar> = {}): WorkingCalendar => ({
  timeZone: 'Asia/Kuala_Lumpur',
  workStart: '07:30',
  workEnd: '17:00',
  weekendDays: [6, 7],
  holidays: new Set(),
  extraWorkingDays: new Set(),
  ...overrides,
});
const WEEK_ONE = { from: '2026-11-02', to: '2026-11-06' };
/** Nothing flagged or asked for, unless a test says otherwise. */
const QUIET = { taskMinutes: 0, flaggedDeadlines: 0, extensionRequests: 0 };

const slot = (id: string, weekday: number, subjectName: string | null = 'Matematik', createdOn = '2026-01-01'): ScheduledSlot =>
  ({ id, weekday, subjectName, createdOn });
const held = (slotId: string | null, onDate: string, subjectName: string | null = 'Matematik'): LessonRecordFact =>
  ({ slotId, onDate, subjectName, status: 'held', reason: null });
const notHeld = (slotId: string, onDate: string, reason: LessonRecordFact['reason']): LessonRecordFact =>
  ({ slotId, onDate, subjectName: 'Matematik', status: 'not_held', reason });

describe('reportPeriod', () => {
  it('covers a month that is over in full', () => {
    expect(reportPeriod('2026-10', '2026-11-13')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('covers the current month up to yesterday, because today is still going on', () => {
    expect(reportPeriod('2026-11', '2026-11-13')).toEqual({ from: '2026-11-01', to: '2026-11-12' });
  });

  it('has nothing to cover on the first day of the month', () => {
    expect(reportPeriod('2026-11', '2026-11-01')).toBeNull();
  });

  it('copes with month ends and leap years', () => {
    expect(reportPeriod('2028-02', '2028-03-01')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
});

describe('workingDaysIn', () => {
  it('skips the weekend and holidays and keeps a replacement working day', () => {
    const days = workingDaysIn({ from: '2026-11-02', to: '2026-11-08' }, calendar({
      holidays: new Set(['2026-11-04']), extraWorkingDays: new Set(['2026-11-07']),
    }));
    expect(days).toEqual(['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06', '2026-11-07']);
  });
});

describe('countLessons', () => {
  it('schedules each lesson on every working day of its weekday and matches the records', () => {
    const result = countLessons({
      calendar: calendar(),
      period: { from: '2026-11-02', to: '2026-11-13' },
      slots: [slot('mon', 1), slot('wed', 3, 'Sains')],
      records: [held('mon', '2026-11-02'), notHeld('mon', '2026-11-09', 'official_duty'), held('wed', '2026-11-04', 'Sains')],
    });
    expect(result).toMatchObject({ scheduled: 4, held: 2, notHeld: 1, notRecorded: 1 });
    expect(result.reasons.official_duty).toBe(1);
    expect(result.reasons.leave).toBe(0);
    expect(result.bySubject).toEqual([
      { subject: 'Matematik', scheduled: 2, held: 1, notHeld: 1, notRecorded: 0 },
      { subject: 'Sains', scheduled: 2, held: 1, notHeld: 0, notRecorded: 1 },
    ]);
  });

  it('does not schedule a lesson before its period was added, nor on a holiday', () => {
    const result = countLessons({
      calendar: calendar({ holidays: new Set(['2026-11-09']) }),
      period: { from: '2026-11-02', to: '2026-11-16' },
      slots: [slot('mon', 1, 'Matematik', '2026-11-05')],
      records: [],
    });
    // 2 November is before the period existed; 9 November is a holiday; 16 November counts.
    expect(result).toMatchObject({ scheduled: 1, notRecorded: 1 });
  });

  it('still counts a record whose period was deleted, or whose day later became a holiday', () => {
    const result = countLessons({
      calendar: calendar({ holidays: new Set(['2026-11-03']) }),
      period: WEEK_ONE,
      slots: [slot('tue', 2)],
      records: [held(null, '2026-11-02', 'Sejarah'), held('tue', '2026-11-03')],
    });
    expect(result).toMatchObject({ scheduled: 2, held: 2, notRecorded: 0 });
    expect(result.bySubject.map((row) => row.subject)).toEqual(['Matematik', 'Sejarah']);
  });

  it('lists lessons with no subject last', () => {
    const result = countLessons({ calendar: calendar(), period: WEEK_ONE, slots: [slot('a', 1, null), slot('b', 1, 'Bahasa Melayu')], records: [] });
    expect(result.bySubject.map((row) => row.subject)).toEqual(['Bahasa Melayu', null]);
  });

  it('is all zero when no day has finished', () => {
    expect(countLessons({ calendar: calendar(), period: null, slots: [slot('mon', 1)], records: [] }))
      .toMatchObject({ scheduled: 0, held: 0, notHeld: 0, notRecorded: 0, bySubject: [] });
  });
});

describe('summariseWellbeing', () => {
  const teacher = (minutesTeachingOnMonday: number) => ({
    slots: minutesTeachingOnMonday > 0 ? [{ weekday: 1 as const, start: '08:00', end: `${String(8 + minutesTeachingOnMonday / 60).padStart(2, '0')}:00` }] : [],
    datedSlots: [],
  });

  it('averages free time per teacher per working day, and task work per teacher', () => {
    const teachers = [teacher(60), teacher(120), teacher(0), teacher(0), teacher(0)];
    const result = summariseWellbeing({
      calendar: calendar(), period: WEEK_ONE, teachers, taskMinutes: 600, flaggedDeadlines: 2, extensionRequests: 3,
    });
    // Five teachers, five working days: 25 teacher-days of 570 minutes, less 180 minutes of Monday lessons.
    expect(result).toEqual({
      teachingStaff: 5,
      workingDays: 5,
      averagesShown: true,
      averageFreeMinutesPerDay: Math.round((25 * DAY - 180) / 25),
      averageTaskMinutes: 120,
      flaggedDeadlines: 2,
      extensionRequests: 3,
    });
  });

  it('counts relief classes as teaching, not free time', () => {
    const relief = [{ date: '2026-11-03', start: '10:00', end: '11:00' }];
    const teachers = Array.from({ length: 5 }, () => ({ slots: [], datedSlots: relief }));
    const result = summariseWellbeing({ calendar: calendar(), period: WEEK_ONE, teachers, ...QUIET });
    expect(result.averageFreeMinutesPerDay).toBe(Math.round((5 * DAY - 60) / 5));
  });

  it('withholds the averages when too few people teach to keep anyone unnamed', () => {
    const result = summariseWellbeing({
      calendar: calendar(), period: WEEK_ONE, teachers: [teacher(60), teacher(0)], ...QUIET, taskMinutes: 300, flaggedDeadlines: 1,
    });
    expect(result).toMatchObject({
      teachingStaff: 2, averagesShown: false, averageFreeMinutesPerDay: null, averageTaskMinutes: null, flaggedDeadlines: 1,
    });
  });

  it('shows no averages before any day of the month has finished', () => {
    const teachers = Array.from({ length: 6 }, () => teacher(0));
    const result = summariseWellbeing({ calendar: calendar(), period: null, teachers, ...QUIET });
    expect(result).toMatchObject({ workingDays: 0, averagesShown: false, averageFreeMinutesPerDay: null });
  });
});
