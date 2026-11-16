import { apiFetch } from '@/shared/api/api-client';
import type { LessonDay, LessonRecord, LessonRecordInput, LessonTarget } from '../interfaces/lesson.interface';

export const lessonDayKey = (onDate: string) => ['lessons', 'day', onDate] as const;

export function fetchLessonDay(onDate: string): Promise<LessonDay> {
  return apiFetch(`/api/lessons?onDate=${encodeURIComponent(onDate)}`);
}

export function saveLessonRecord(input: LessonRecordInput): Promise<LessonRecord> {
  return apiFetch('/api/lessons/records', { method: 'PUT', body: input });
}

/** Adds or replaces the photo on a lesson record. Send a photo prepared by preparePhoto. */
export function addLessonPhoto(target: LessonTarget, photo: File): Promise<LessonRecord> {
  const form = new FormData();
  form.set('slotId', target.slotId);
  form.set('onDate', target.onDate);
  form.set('photo', photo);
  return apiFetch('/api/lessons/records/photo', { method: 'POST', body: form });
}

export function removeLessonPhoto(target: LessonTarget): Promise<void> {
  const query = new URLSearchParams({ slotId: target.slotId, onDate: target.onDate });
  return apiFetch(`/api/lessons/records/photo?${query.toString()}`, { method: 'DELETE' });
}
