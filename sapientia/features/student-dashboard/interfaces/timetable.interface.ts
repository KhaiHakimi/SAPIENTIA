import type { ClassLesson } from '@/features/timetable/interfaces/timetable.interface';

/** A lesson's start and end, "HH:mm" school time: all the now/past rules need. */
export type LessonTimes = Pick<ClassLesson, 'startTime' | 'endTime'>;

export type SlotStatus = 'past' | 'now' | 'upcoming';

export interface SlotProgress {
  minutesLeft: number;
  percent: number;
}
