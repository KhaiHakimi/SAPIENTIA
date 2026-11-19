import { describe, expect, it } from 'vitest';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { digestWeekDue } from './digest-schedule.service';

const calendar = (holidays: string[] = [], weekendDays: WorkingCalendar['weekendDays'] = [6, 7]): WorkingCalendar => ({
  timeZone: 'Asia/Kuala_Lumpur', workStart: '07:30', workEnd: '17:00', weekendDays,
  holidays: new Set(holidays), extraWorkingDays: new Set(),
});
// Times below are written in Kuala Lumpur time (+08:00).
const at = (local: string) => new Date(`${local}+08:00`);
const WEEK = { weekOf: '2026-11-23', weekEndsOn: '2026-11-29' };

describe('digestWeekDue', () => {
  it('is due on Monday from the start of working hours until midnight', () => {
    expect(digestWeekDue(at('2026-11-23T07:29:59'), calendar())).toBeNull();
    expect(digestWeekDue(at('2026-11-23T07:30:00'), calendar())).toEqual({ ...WEEK, today: '2026-11-23' });
    expect(digestWeekDue(at('2026-11-23T23:59:00'), calendar())).toEqual({ ...WEEK, today: '2026-11-23' });
    expect(digestWeekDue(at('2026-11-24T08:00:00'), calendar())).toBeNull();
  });

  it('moves to the first working day when Monday is a holiday', () => {
    const holidayMonday = calendar(['2026-11-23']);
    expect(digestWeekDue(at('2026-11-23T09:00:00'), holidayMonday)).toBeNull();
    expect(digestWeekDue(at('2026-11-24T07:30:00'), holidayMonday)).toEqual({ ...WEEK, today: '2026-11-24' });
  });

  it('follows a Friday-Saturday weekend, where the week still starts on Monday', () => {
    expect(digestWeekDue(at('2026-11-22T09:00:00'), calendar([], [5, 6]))).toBeNull();
    expect(digestWeekDue(at('2026-11-23T09:00:00'), calendar([], [5, 6]))).toEqual({ ...WEEK, today: '2026-11-23' });
  });

  it('has no digest in a week with no working day', () => {
    const allOff = calendar(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']);
    for (const day of ['2026-11-23', '2026-11-25', '2026-11-27']) expect(digestWeekDue(at(`${day}T09:00:00`), allOff)).toBeNull();
  });

  it('reads the instant in the school time zone, not the server one', () => {
    // 23:45 UTC on Sunday is 07:45 on Monday in Kuala Lumpur.
    expect(digestWeekDue(new Date('2026-11-22T23:45:00Z'), calendar())).toEqual({ ...WEEK, today: '2026-11-23' });
  });
});
