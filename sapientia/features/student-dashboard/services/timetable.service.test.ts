import { describe, expect, it } from 'vitest';
import type { TimetableSlot } from '../interfaces/timetable.interface';
import { slotProgress, slotStatus, toMinutes } from './timetable.service';

const science: TimetableSlot = { from: '09:30', to: '10:30', subject: 'sci', room: 'Lab 1' };
const at = (hhmm: string) => toMinutes(hhmm);

describe('timetable', () => {
  it('reads "HH:MM" as minutes after midnight', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('10:15')).toBe(615);
  });

  it('marks a lesson past, now or upcoming on today only', () => {
    expect(slotStatus(science, true, at('09:00'))).toBe('upcoming');
    expect(slotStatus(science, true, at('09:30'))).toBe('now');
    expect(slotStatus(science, true, at('10:29'))).toBe('now');
    expect(slotStatus(science, true, at('10:30'))).toBe('past');
    expect(slotStatus(science, false, at('11:00'))).toBe('upcoming');
  });

  it('works out the time left and how far through the lesson we are', () => {
    expect(slotProgress(science, at('10:15'))).toEqual({ minutesLeft: 15, percent: 75 });
  });
});
