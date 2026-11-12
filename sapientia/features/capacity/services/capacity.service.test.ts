import { describe, expect, it } from 'vitest';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import type { Commitment, WeeklySlot } from '../interfaces/capacity.interface';
import { checkFeasibility, freeMinutes, weekEndDay } from './capacity.service';

/** 07:30 to 17:00 is 570 working minutes a day. 2 November 2026 is a Monday. */
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
const at = (local: string) => new Date(`${local}:00+08:00`);
const MONDAY = '2026-11-02';
const MONDAY_START = at('2026-11-02T07:30');

describe('freeMinutes', () => {
  it('is the whole working day when nothing is timetabled', () => {
    expect(freeMinutes(calendar(), [], MONDAY_START, MONDAY)).toBe(DAY);
  });

  it('takes timetable periods out of the day they fall on', () => {
    const slots: WeeklySlot[] = [{ weekday: 1, start: '08:00', end: '09:00' }, { weekday: 2, start: '10:00', end: '11:30' }];
    expect(freeMinutes(calendar(), slots, MONDAY_START, MONDAY)).toBe(DAY - 60);
    expect(freeMinutes(calendar(), slots, MONDAY_START, '2026-11-03')).toBe(2 * DAY - 60 - 90);
  });

  it('counts only what is left of the first day, and only the part of a period still to come', () => {
    const slots: WeeklySlot[] = [{ weekday: 1, start: '08:00', end: '09:00' }, { weekday: 1, start: '11:30', end: '12:30' }];
    // From noon: five hours to 17:00, less the half hour of the period that runs to 12:30.
    expect(freeMinutes(calendar(), slots, at('2026-11-02T12:00'), MONDAY)).toBe(300 - 30);
  });

  it('gives nothing for the evening: time outside working hours is never free', () => {
    expect(freeMinutes(calendar(), [], at('2026-11-02T22:00'), MONDAY)).toBe(0);
    expect(freeMinutes(calendar(), [], at('2026-11-02T22:00'), '2026-11-03')).toBe(DAY);
  });

  it('skips the weekend', () => {
    expect(freeMinutes(calendar(), [], at('2026-11-06T16:00'), '2026-11-08')).toBe(60);
  });

  it('works with a Friday and Saturday weekend', () => {
    const kelantan = calendar({ weekendDays: [5, 6] });
    // Thursday 16:00 to Sunday: one hour on Thursday, then all of Sunday.
    expect(freeMinutes(kelantan, [], at('2026-11-05T16:00'), '2026-11-08')).toBe(60 + DAY);
  });

  it('skips holidays and counts replacement working days', () => {
    const withEvents = calendar({ holidays: new Set(['2026-11-03']), extraWorkingDays: new Set(['2026-11-07']) });
    // Monday to Sunday: Tuesday is off, Saturday is worked.
    expect(freeMinutes(withEvents, [], MONDAY_START, '2026-11-08')).toBe(5 * DAY);
  });

  it('ignores periods outside working hours and counts overlapping periods once', () => {
    const slots: WeeklySlot[] = [
      { weekday: 1, start: '17:00', end: '18:00' },
      { weekday: 1, start: '06:30', end: '08:00' },
      { weekday: 1, start: '10:00', end: '11:00' },
      { weekday: 1, start: '10:30', end: '11:30' },
    ];
    // 07:30 to 08:00 of the early period, and 10:00 to 11:30 for the two that overlap.
    expect(freeMinutes(calendar(), slots, MONDAY_START, MONDAY)).toBe(DAY - 30 - 90);
  });

  it('is zero when the day is already over', () => {
    expect(freeMinutes(calendar(), [], at('2026-11-03T08:00'), MONDAY)).toBe(0);
  });
});

describe('weekEndDay', () => {
  it('is the Sunday of the school\'s week, whatever the server\'s own time zone', () => {
    expect(weekEndDay(MONDAY_START, 'Asia/Kuala_Lumpur')).toBe('2026-11-08');
    expect(weekEndDay(at('2026-11-08T23:30'), 'Asia/Kuala_Lumpur')).toBe('2026-11-08');
    // 00:30 on Monday at the school is still Sunday in UTC.
    expect(weekEndDay(at('2026-11-09T00:30'), 'Asia/Kuala_Lumpur')).toBe('2026-11-15');
  });
});

describe('checkFeasibility', () => {
  const check = (neededMinutes: number, dueOn: string, extra: { slots?: WeeklySlot[]; commitments?: Commitment[]; from?: Date } = {}) =>
    checkFeasibility({
      calendar: calendar(), slots: extra.slots ?? [], commitments: extra.commitments ?? [], from: extra.from ?? MONDAY_START,
      dueOn, neededMinutes,
    });

  it('passes when the time exists, and reports the totals', () => {
    const slots: WeeklySlot[] = [{ weekday: 1, start: '08:00', end: '10:00' }];
    expect(check(120, MONDAY, { slots })).toEqual({
      feasible: true, neededMinutes: 120, freeMinutes: DAY - 120, workingMinutes: DAY, teachingMinutes: 120, committedMinutes: 0,
      earliestDueOn: MONDAY,
    });
  });

  it('passes when the estimate is exactly the free time', () => {
    expect(check(DAY, MONDAY).feasible).toBe(true);
    expect(check(DAY + 1, MONDAY).feasible).toBe(false);
  });

  it('flags a deadline that teaching leaves no room for, with the earliest realistic date', () => {
    const fullMonday: WeeklySlot[] = [{ weekday: 1, start: '07:30', end: '16:00' }];
    const result = check(120, MONDAY, { slots: fullMonday });
    expect(result).toMatchObject({ feasible: false, freeMinutes: 60, teachingMinutes: 510, earliestDueOn: '2026-11-03' });
  });

  it('counts work already due by then', () => {
    expect(check(200, '2026-11-03', { commitments: [{ dueOn: '2026-11-03', minutes: 500 }] }))
      .toMatchObject({ feasible: true, committedMinutes: 500, freeMinutes: 2 * DAY - 500 });
    expect(check(200, '2026-11-03', { commitments: [{ dueOn: '2026-11-03', minutes: 1000 }] }))
      .toMatchObject({ feasible: false, freeMinutes: 140, earliestDueOn: '2026-11-04' });
  });

  it('counts overdue work too: it still has to be done', () => {
    expect(check(100, MONDAY, { commitments: [{ dueOn: '2026-10-20', minutes: 500 }] })).toMatchObject({ feasible: false, committedMinutes: 500 });
  });

  it('does not count work due after the deadline (single-total simplification)', () => {
    expect(check(500, MONDAY, { commitments: [{ dueOn: '2026-11-04', minutes: 600 }] })).toMatchObject({ feasible: true, committedMinutes: 0 });
  });

  it('never suggests a date before a deadline that fails', () => {
    // Monday alone would fit 400 minutes, but 1,500 minutes fall due on Wednesday, so Wednesday fails and Thursday is the answer.
    const result = check(400, '2026-11-04', { commitments: [{ dueOn: '2026-11-04', minutes: 1500 }] });
    expect(result).toMatchObject({ feasible: false, freeMinutes: 3 * DAY - 1500, earliestDueOn: '2026-11-05' });
  });

  it('starts counting from delivery, so a task held overnight gets nothing from the evening', () => {
    const tuesdayMorning = at('2026-11-03T07:30');
    expect(check(DAY, '2026-11-03', { from: tuesdayMorning }).feasible).toBe(true);
    expect(check(DAY + 60, '2026-11-03', { from: tuesdayMorning })).toMatchObject({ feasible: false, earliestDueOn: '2026-11-04' });
  });

  it('accepts a weekend due date but suggests a working day', () => {
    const friday = at('2026-11-06T07:30');
    expect(check(100, '2026-11-08', { from: friday })).toMatchObject({ feasible: true, earliestDueOn: '2026-11-06' });
    expect(check(DAY + 100, '2026-11-08', { from: friday })).toMatchObject({ feasible: false, earliestDueOn: '2026-11-09' });
  });

  it('never reports negative free time', () => {
    expect(check(60, MONDAY, { commitments: [{ dueOn: MONDAY, minutes: 5000 }] }).freeMinutes).toBe(0);
  });

  it('has no date to suggest when the timetable leaves no free time at all', () => {
    const everyDay: WeeklySlot[] = [1, 2, 3, 4, 5].map((weekday) => ({ weekday: weekday as 1, start: '07:30', end: '17:00' }));
    expect(check(60, MONDAY, { slots: everyDay })).toMatchObject({ feasible: false, earliestDueOn: null });
  });
});
