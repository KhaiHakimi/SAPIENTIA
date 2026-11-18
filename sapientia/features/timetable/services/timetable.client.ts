import { apiFetch } from '@/shared/api/api-client';
import type { ClassWeek, NewTimetableSlot, Timetable, TimetableSlot } from '../interfaces/timetable.interface';

export const TIMETABLE_KEY = ['timetable'] as const;
/** null is the signed-in person's own week. */
export const timetableKey = (teacherId: string | null) => ['timetable', teacherId ?? 'me'] as const;
/** The signed-in pupil's class week starting on a Monday (pupil session). */
export const classWeekKey = (monday: string) => ['student', 'timetable', monday] as const;

export function fetchTimetable(teacherId: string | null): Promise<Timetable> {
  return apiFetch(`/api/timetable${teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : ''}`);
}

export function addTimetableSlot(input: NewTimetableSlot): Promise<TimetableSlot> {
  return apiFetch('/api/timetable/slots', { method: 'POST', body: input });
}

export function removeTimetableSlot(id: string): Promise<void> {
  return apiFetch(`/api/timetable/slots/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchClassWeek(monday: string): Promise<ClassWeek> {
  return apiFetch(`/api/student/timetable?weekOf=${encodeURIComponent(monday)}`);
}
