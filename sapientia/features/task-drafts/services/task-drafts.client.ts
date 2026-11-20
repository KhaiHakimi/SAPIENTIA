import { apiFetch } from '@/shared/api/api-client';
import { TASK_DRAFT_CLIENT_TIMEOUT_MS } from '../constants/task-draft.constants';
import type { AiStatus, TaskDraftRequest, TaskDraftResult } from '../interfaces/task-draft.interface';

export const AI_STATUS_KEY = ['ai', 'status'] as const;

export function fetchAiStatus(): Promise<AiStatus> {
  return apiFetch('/api/ai/status');
}

/** Nothing is saved: the answer only fills the form. */
export function requestTaskDraft(request: TaskDraftRequest): Promise<TaskDraftResult> {
  return apiFetch('/api/ai/task-draft', { method: 'POST', body: request, timeoutMs: TASK_DRAFT_CLIENT_TIMEOUT_MS });
}
