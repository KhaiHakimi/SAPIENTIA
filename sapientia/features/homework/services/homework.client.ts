import { apiFetch } from '@/shared/api/api-client';
import type {
  HandInList, Homework, HomeworkPreview, HomeworkPreviewRequest, MyHomework, PupilHomeworkList, SetHomeworkRequest,
} from '../interfaces/homework.interface';

export const HOMEWORK_ROOT_KEY = ['homework'] as const;
export const MY_HOMEWORK_KEY = [...HOMEWORK_ROOT_KEY, 'mine'] as const;
export const homeworkPreviewKey = (input: HomeworkPreviewRequest) => [...HOMEWORK_ROOT_KEY, 'preview', input] as const;
export const handInsKey = (homeworkId: string) => [...HOMEWORK_ROOT_KEY, 'hand-ins', homeworkId] as const;
/** The signed-in pupil's class homework (pupil session). */
export const PUPIL_HOMEWORK_KEY = ['student', 'homework'] as const;

export function fetchMyHomework(): Promise<MyHomework> {
  return apiFetch('/api/homework');
}

export function fetchHomeworkPreview(input: HomeworkPreviewRequest, signal?: AbortSignal): Promise<HomeworkPreview> {
  return apiFetch('/api/homework/preview', { method: 'POST', body: input, signal });
}

export function setHomework(input: SetHomeworkRequest): Promise<Homework> {
  return apiFetch('/api/homework', { method: 'POST', body: input });
}

export function setHomeworkMarked(id: string, marked: boolean): Promise<Homework> {
  return apiFetch(`/api/homework/${encodeURIComponent(id)}`, { method: 'PATCH', body: { marked } });
}

export function removeHomework(id: string): Promise<void> {
  return apiFetch(`/api/homework/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchHandIns(id: string): Promise<HandInList> {
  return apiFetch(`/api/homework/${encodeURIComponent(id)}/hand-ins`);
}

export function setHandIn(id: string, studentId: string, handedIn: boolean): Promise<{ studentId: string; handedIn: boolean }> {
  return apiFetch(`/api/homework/${encodeURIComponent(id)}/hand-ins/${encodeURIComponent(studentId)}`, {
    method: 'PUT', body: { handedIn },
  });
}

export function fetchPupilHomework(): Promise<PupilHomeworkList> {
  return apiFetch('/api/student/homework');
}
