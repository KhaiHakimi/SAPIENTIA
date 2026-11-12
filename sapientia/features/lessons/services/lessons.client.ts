import { apiFetch } from '@/shared/api/api-client';
import type { LessonDay, LessonRecord, LessonRecordInput } from '../interfaces/lesson.interface';

export const lessonDayKey = (onDate: string) => ['lessons', 'day', onDate] as const;

export function fetchLessonDay(onDate: string): Promise<LessonDay> {
  return apiFetch(`/api/lessons?onDate=${encodeURIComponent(onDate)}`);
}

export function saveLessonRecord(input: LessonRecordInput): Promise<LessonRecord> {
  return apiFetch('/api/lessons/records', { method: 'PUT', body: input });
}
