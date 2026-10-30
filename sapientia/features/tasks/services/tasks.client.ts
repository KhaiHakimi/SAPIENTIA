import { apiFetch } from '@/shared/api/api-client';
import type { Page } from '@/shared/interfaces/api-error.interface';
import type {
  AssignedTask, AssignmentStatus, CreateTaskRequest, SentTask, TaskComment, TaskDetail,
} from '../interfaces/task.interface';

export const TASKS_KEY = ['tasks'] as const;
export const taskKey = (id: string) => ['tasks', 'detail', id] as const;
export const boardKey = (status: AssignmentStatus) => ['tasks', 'assigned', status] as const;
export const SENT_KEY = ['tasks', 'sent'] as const;
export const HELD_KEY = ['tasks', 'held'] as const;

const cursorParam = (cursor: string | null) => (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');

export function fetchBoardColumn(status: AssignmentStatus, cursor: string | null): Promise<Page<AssignedTask>> {
  return apiFetch(`/api/tasks?view=assigned&status=${status}&limit=25${cursorParam(cursor)}`);
}

export function fetchSentTasks(cursor: string | null, heldOnly = false): Promise<Page<SentTask>> {
  return apiFetch(`/api/tasks?view=${heldOnly ? 'held' : 'sent'}&limit=25${cursorParam(cursor)}`);
}

export function fetchTask(id: string): Promise<TaskDetail> {
  return apiFetch(`/api/tasks/${encodeURIComponent(id)}`);
}

/** The key is made once per form, so pressing Send twice or retrying after a dropped connection creates one task. */
export function createTask(input: CreateTaskRequest, idempotencyKey: string): Promise<TaskDetail> {
  return apiFetch('/api/tasks', { method: 'POST', body: input, headers: { 'Idempotency-Key': idempotencyKey } });
}

export function setMyStatus(id: string, status: AssignmentStatus): Promise<{ status: AssignmentStatus }> {
  return apiFetch(`/api/tasks/${encodeURIComponent(id)}/assignments/me`, { method: 'PATCH', body: { status } });
}

export function addComment(id: string, body: string): Promise<TaskComment> {
  return apiFetch(`/api/tasks/${encodeURIComponent(id)}/comments`, { method: 'POST', body: { body } });
}
