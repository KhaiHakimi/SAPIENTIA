import type { ClassDay } from '@/features/timetable/interfaces/timetable.interface';
import type { PixelSpriteName } from '@/shared/sprites/pixel-sprites';
import type { LessonTimes, SlotProgress, SlotStatus } from '../interfaces/timetable.interface';

/** Subject names are the school's own; these words mark a physical education lesson, which gets a trophy instead of a scroll. */
const SPORT_SUBJECT = /jasmani|physical education|sukan|sport|\bPJ\b|\bPE\b/i;

/** "HH:MM" to minutes after midnight. */
export function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Where a lesson stands at a given time. Lessons on other days are always "upcoming", so nothing is greyed out there. */
export function slotStatus(lesson: LessonTimes, isToday: boolean, nowMinutes: number): SlotStatus {
  if (!isToday) return 'upcoming';
  if (nowMinutes >= toMinutes(lesson.endTime)) return 'past';
  if (nowMinutes >= toMinutes(lesson.startTime)) return 'now';
  return 'upcoming';
}

/** How far through the current lesson we are. */
export function slotProgress(lesson: LessonTimes, nowMinutes: number): SlotProgress {
  const start = toMinutes(lesson.startTime);
  const end = toMinutes(lesson.endTime);
  return { minutesLeft: end - nowMinutes, percent: Math.round(((nowMinutes - start) / (end - start)) * 100) };
}

export function lessonSprite(subjectName: string): PixelSpriteName {
  return SPORT_SUBJECT.test(subjectName) ? 'trophy' : 'scroll';
}

/** The days the weekly scroll shows: Monday to Friday always (a weekday off says so), a weekend day only when it is a school day. */
export function daysToShow(days: readonly ClassDay[]): ClassDay[] {
  return days.filter((day) => day.weekday <= 5 || day.schoolDay);
}
