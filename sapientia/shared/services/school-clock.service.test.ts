import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, mondayOf, schoolNow, weekdayIndex } from './school-clock.service';

describe('school clock', () => {
  it('takes the date and time at the school, not on the device', () => {
    // 23:30 UTC on Wednesday is 07:30 on Thursday in Kuala Lumpur.
    expect(schoolNow(new Date('2026-11-18T23:30:00Z'), 'Asia/Kuala_Lumpur')).toEqual({ today: '2026-11-19', minutes: 7 * 60 + 30 });
  });

  it('finds the Monday of a week and moves by weeks and days', () => {
    expect(mondayOf('2026-11-19')).toBe('2026-11-16');
    expect(mondayOf('2026-11-22')).toBe('2026-11-16'); // Sunday belongs to the week before
    expect(mondayOf('2026-11-19', 1)).toBe('2026-11-23');
    expect(mondayOf('2026-11-19', -1)).toBe('2026-11-09');
    expect(addDays('2026-11-30', 4)).toBe('2026-12-04');
    expect(daysBetween('2026-11-19', '2026-11-16')).toBe(-3);
    expect(weekdayIndex('2026-11-16')).toBe(0);
    expect(weekdayIndex('2026-11-22')).toBe(6);
  });
});
