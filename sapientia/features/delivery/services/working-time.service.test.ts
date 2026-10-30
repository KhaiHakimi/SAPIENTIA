import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '@/shared/server/app-errors';
import type { IsoWeekday, WorkingCalendar } from '../interfaces/working-calendar.interface';
import { deliveryTime, isWithinWorkingHours, isWorkingDay, nextWorkingStart } from './working-time.service';

/**
 * Every case the plan lists for Sprint 4. Times are written in Malaysia time (UTC+8, no daylight saving) and converted, so
 * the tests mean the same thing on any machine. 2 November 2026 is a Monday.
 */
const myt = (local: string) => new Date(`${local}+08:00`);

function calendar(overrides: Partial<WorkingCalendar> = {}): WorkingCalendar {
  return {
    timeZone: 'Asia/Kuala_Lumpur',
    workStart: '07:30',
    workEnd: '17:00',
    weekendDays: [6, 7],
    holidays: new Set(),
    extraWorkingDays: new Set(),
    ...overrides,
  };
}

const FRIDAY_SATURDAY: IsoWeekday[] = [5, 6];

describe('working days', () => {
  it('treats the weekend and holidays as days off, and a replacement working day as a working day', () => {
    const cal = calendar({ holidays: new Set(['2026-11-04']), extraWorkingDays: new Set(['2026-11-07']) });
    expect(isWorkingDay('2026-11-02', cal)).toBe(true); // Monday
    expect(isWorkingDay('2026-11-04', cal)).toBe(false); // holiday on a Wednesday
    expect(isWorkingDay('2026-11-07', cal)).toBe(true); // Saturday made a working day
    expect(isWorkingDay('2026-11-08', cal)).toBe(false); // Sunday
  });

  it('uses a Friday and Saturday weekend when the school sets one', () => {
    const cal = calendar({ weekendDays: FRIDAY_SATURDAY });
    expect(isWorkingDay('2026-11-06', cal)).toBe(false); // Friday
    expect(isWorkingDay('2026-11-08', cal)).toBe(true); // Sunday
  });
});

describe('delivery time', () => {
  it('holds a task created at 10 pm on a weekday until 7:30 the next morning', () => {
    expect(deliveryTime(myt('2026-11-03T22:00'), calendar())).toEqual(myt('2026-11-04T07:30'));
  });

  it('holds a task created at 2 am until 7:30 the same morning', () => {
    expect(deliveryTime(myt('2026-11-04T02:00'), calendar())).toEqual(myt('2026-11-04T07:30'));
  });

  it('holds a task created at 3 pm on Friday in a Friday-Saturday state until Sunday 7:30', () => {
    expect(deliveryTime(myt('2026-11-06T15:00'), calendar({ weekendDays: FRIDAY_SATURDAY }))).toEqual(myt('2026-11-08T07:30'));
  });

  it('delivers at once at 3 pm on Thursday in a Friday-Saturday state', () => {
    const createdAt = myt('2026-11-05T15:00');
    expect(deliveryTime(createdAt, calendar({ weekendDays: FRIDAY_SATURDAY }))).toEqual(createdAt);
  });

  it('holds a task created on the eve of a public holiday until the next working day after it', () => {
    const cal = calendar({ holidays: new Set(['2026-11-04']) });
    expect(deliveryTime(myt('2026-11-03T21:00'), cal)).toEqual(myt('2026-11-05T07:30'));
  });

  it('skips a holiday that falls on Friday and the weekend after it', () => {
    const cal = calendar({ holidays: new Set(['2026-11-06']) });
    expect(deliveryTime(myt('2026-11-05T18:00'), cal)).toEqual(myt('2026-11-09T07:30'));
  });

  it('skips a whole school holiday', () => {
    const holidays = new Set(Array.from({ length: 14 }, (_, day) => `2026-11-${String(day + 9).padStart(2, '0')}`));
    expect(deliveryTime(myt('2026-11-06T20:00'), calendar({ holidays }))).toEqual(myt('2026-11-23T07:30'));
  });

  it('delivers at once exactly at work_start', () => {
    const createdAt = myt('2026-11-04T07:30');
    expect(isWithinWorkingHours(createdAt, calendar())).toBe(true);
    expect(deliveryTime(createdAt, calendar())).toEqual(createdAt);
  });

  it('holds a task created exactly at work_end until the next morning', () => {
    const createdAt = myt('2026-11-04T17:00');
    expect(isWithinWorkingHours(createdAt, calendar())).toBe(false);
    expect(deliveryTime(createdAt, calendar())).toEqual(myt('2026-11-05T07:30'));
  });

  it('holds a task created one minute before work_start until work_start', () => {
    expect(deliveryTime(myt('2026-11-04T07:29'), calendar())).toEqual(myt('2026-11-04T07:30'));
  });

  it('holds a task created at 10 pm on Friday until Monday 7:30', () => {
    expect(deliveryTime(myt('2026-11-06T22:00'), calendar())).toEqual(myt('2026-11-09T07:30'));
  });

  it('delivers on a Saturday the school has made a working day', () => {
    const cal = calendar({ extraWorkingDays: new Set(['2026-11-07']) });
    expect(deliveryTime(myt('2026-11-06T22:00'), cal)).toEqual(myt('2026-11-07T07:30'));
  });

  it('uses the school time zone, not the server one', () => {
    // 23:30 UTC on Tuesday is 7:30 on Wednesday at the school.
    expect(deliveryTime(new Date('2026-11-03T23:30:00Z'), calendar())).toEqual(new Date('2026-11-03T23:30:00Z'));
  });

  it('refuses a calendar with no working days instead of looping', () => {
    const cal = calendar({ weekendDays: [1, 2, 3, 4, 5, 6, 7] as IsoWeekday[] });
    expect(() => nextWorkingStart(myt('2026-11-04T22:00'), cal)).toThrow(ConfigurationError);
  });
});
