import { describe, expect, it } from 'vitest';
import type { ClassDay } from '@/features/timetable/interfaces/timetable.interface';
import type { Quest } from '../interfaces/quest.interface';
import { isReminderTime, nextSchoolDay, questsToRemind } from './reminder.service';

const day = (date: string, weekday: ClassDay['weekday'], schoolDay = true): ClassDay => ({ date, weekday, schoolDay, lessons: [] });
const quest = (id: string, dueOn: string, handedIn = false): Quest => ({
  id, subjectName: 'Sains', title: id, teacherName: 'Cikgu', details: null, dueOn, xp: 30, coins: 10, handedIn, comments: [],
});

describe('the afternoon reminder', () => {
  it('shows from 2 pm until just before 6 pm only, never in the evening or at night', () => {
    expect(isReminderTime(13 * 60 + 59)).toBe(false);
    expect(isReminderTime(14 * 60)).toBe(true);
    expect(isReminderTime(17 * 60 + 59)).toBe(true);
    expect(isReminderTime(18 * 60)).toBe(false);
    expect(isReminderTime(22 * 60)).toBe(false);
  });

  it('reminds on Friday about Monday, and skips a holiday', () => {
    // 20 November 2026 is a Friday; Monday 23 November is a holiday here, so the next school day is Tuesday.
    const days = [
      day('2026-11-19', 4), day('2026-11-20', 5), day('2026-11-21', 6, false), day('2026-11-22', 7, false),
      day('2026-11-23', 1, false), day('2026-11-24', 2),
    ];
    expect(nextSchoolDay('2026-11-19', days)).toBe('2026-11-20');
    expect(nextSchoolDay('2026-11-20', days)).toBe('2026-11-24');
    expect(nextSchoolDay('2026-11-24', days)).toBeNull();
  });

  it('lists only work due that day that is neither received by the teacher nor ticked by the pupil', () => {
    const quests = [quest('a', '2026-11-20'), quest('b', '2026-11-20', true), quest('c', '2026-11-20'), quest('d', '2026-11-23')];
    expect(questsToRemind(quests, { c: true }, '2026-11-20').map((item) => item.id)).toEqual(['a']);
  });
});
