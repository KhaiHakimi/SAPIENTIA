import { apiFetch } from '@/shared/api/api-client';
import type { ExtensionDecision, ExtensionRequest, ExtensionSuggestion, NewExtensionRequest } from '../interfaces/extension.interface';

/** Under the tasks key, so anything that refreshes the task lists also refreshes the figures. */
export const extensionSuggestionKey = (taskId: string) => ['tasks', 'extension-suggestion', taskId] as const;

const taskPath = (taskId: string) => `/api/tasks/${encodeURIComponent(taskId)}`;

export function fetchExtensionSuggestion(taskId: string): Promise<ExtensionSuggestion> {
  return apiFetch(`${taskPath(taskId)}/extension-suggestion`);
}

export function requestExtension(taskId: string, input: NewExtensionRequest): Promise<ExtensionRequest> {
  return apiFetch(`${taskPath(taskId)}/extension-requests`, { method: 'POST', body: input });
}

export function answerExtension(taskId: string, requestId: string, decision: ExtensionDecision): Promise<ExtensionRequest> {
  return apiFetch(`${taskPath(taskId)}/extension-requests/${encodeURIComponent(requestId)}`, { method: 'PATCH', body: decision });
}
