import { describe, expect, it } from 'vitest';
import type { ClassDay } from '@/features/timetable/interfaces/timetable.interface';
import type { LessonTimes } from '../interfaces/timetable.interface';
import { daysToShow, lessonSprite, slotProgress, slotStatus, toMinutes } from './timetable.service';

const science: LessonTimes = { startTime: '09:30', endTime: '10:30' };
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

  it('gives physical education a trophy and every other subject a scroll', () => {
    expect(lessonSprite('Pendidikan Jasmani')).toBe('trophy');
    expect(lessonSprite('PJ 4 Amanah')).toBe('trophy');
    expect(lessonSprite('Physical Education')).toBe('trophy');
    expect(lessonSprite('Matematik')).toBe('scroll');
    expect(lessonSprite('Pendidikan Seni')).toBe('scroll');
  });

  it('shows Monday to Friday always, and a weekend day only when it is a school day', () => {
    const day = (weekday: ClassDay['weekday'], schoolDay: boolean): ClassDay => ({ date: `2026-11-${15 + weekday}`, weekday, schoolDay, lessons: [] });
    const week = [day(1, true), day(2, false), day(3, true), day(4, true), day(5, true), day(6, true), day(7, false)];
    expect(daysToShow(week).map((shown) => shown.weekday)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
