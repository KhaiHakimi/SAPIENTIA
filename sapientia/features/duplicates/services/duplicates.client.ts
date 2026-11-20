import { apiFetch } from '@/shared/api/api-client';
import type { SimilarTasksRequest, SimilarTasksResult } from '../interfaces/similar-task.interface';

export const similarTasksKey = (request: SimilarTasksRequest) =>
  ['tasks', 'similar', request.title.toLowerCase(), request.assigneeIds.join(',')] as const;

/** A dry run: nothing is saved. */
export function fetchSimilarTasks(request: SimilarTasksRequest, signal?: AbortSignal): Promise<SimilarTasksResult> {
  return apiFetch('/api/tasks/similar', { method: 'POST', body: request, signal });
}
