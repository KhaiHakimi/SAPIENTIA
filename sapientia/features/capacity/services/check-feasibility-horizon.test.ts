import { describe, expect, it } from 'vitest';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { checkFeasibility } from './capacity.service';

const calendar: WorkingCalendar = {
  timeZone: 'Asia/Kuala_Lumpur',
  workStart: '07:30',
  workEnd: '17:00',
  weekendDays: [6, 7],
  holidays: new Set(),
  extraWorkingDays: new Set(),
};

describe('checkFeasibility horizon', () => {
  it('answers at once for a due date thousands of years ahead, instead of walking every day to it', () => {
    const started = performance.now();
    const result = checkFeasibility({
      calendar, slots: [], datedSlots: [], commitments: [], from: new Date('2026-11-02T07:30:00+08:00'),
      dueOn: '9999-12-31', neededMinutes: 60,
    });
    // Walking to the year 9999 takes minutes; the capped walk is about a year and a half of days.
    expect(performance.now() - started).toBeLessThan(1000);
    expect(result.earliestDueOn).toBe('2026-11-02');
  });
});
