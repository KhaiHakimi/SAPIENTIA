import { describe, expect, it } from 'vitest';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { checkMeetingTime } from './meeting-time.service';

/** Malaysia time (UTC+8). 18 November 2026 is a Wednesday; 21 and 22 November are the weekend; 23 November is a holiday. */
const myt = (local: string) => new Date(`${local}+08:00`);
const NOW = myt('2026-11-18T10:00:00');

const calendar: WorkingCalendar = {
  timeZone: 'Asia/Kuala_Lumpur',
  workStart: '07:30',
  workEnd: '17:00',
  weekendDays: [6, 7],
  holidays: new Set(['2026-11-23']),
  extraWorkingDays: new Set(),
};

describe('checkMeetingTime', () => {
  it('accepts a time later today or on a later working day, inside working hours', () => {
    expect(checkMeetingTime('2026-11-18', '14:30', NOW, calendar)).toEqual({ ok: true, at: myt('2026-11-18T14:30:00') });
    expect(checkMeetingTime('2026-11-24', '07:30', NOW, calendar)).toEqual({ ok: true, at: myt('2026-11-24T07:30:00') });
  });

  it('refuses a time already passed', () => {
    expect(checkMeetingTime('2026-11-18', '09:00', NOW, calendar)).toEqual({ ok: false, field: 'date', reason: 'meeting_in_past' });
    expect(checkMeetingTime('2026-11-17', '11:00', NOW, calendar)).toEqual({ ok: false, field: 'date', reason: 'meeting_in_past' });
  });

  it('refuses the evening, the weekend and a holiday', () => {
    const outside = { ok: false, field: 'time', reason: 'meeting_outside_hours' };
    expect(checkMeetingTime('2026-11-18', '17:00', NOW, calendar)).toEqual(outside);
    expect(checkMeetingTime('2026-11-19', '07:00', NOW, calendar)).toEqual(outside);
    expect(checkMeetingTime('2026-11-21', '10:00', NOW, calendar)).toEqual(outside);
    expect(checkMeetingTime('2026-11-23', '10:00', NOW, calendar)).toEqual(outside);
  });

  it('refuses a date more than 60 days ahead', () => {
    // 17 January 2027, day 60, is a Sunday: made a working day here so only the distance is tested.
    const sundayAtWork = { ...calendar, extraWorkingDays: new Set(['2027-01-17']) };
    expect(checkMeetingTime('2027-01-17', '10:00', NOW, sundayAtWork).ok).toBe(true);
    expect(checkMeetingTime('2027-01-18', '10:00', NOW, calendar)).toEqual({ ok: false, field: 'date', reason: 'meeting_too_far' });
  });
});
