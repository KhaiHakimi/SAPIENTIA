import { apiFetch } from '@/shared/api/api-client';
import type { FeasibilityRequest, FeasibilityResponse, Workload } from '../interfaces/capacity.interface';

/** Under the tasks key: sending a task or finishing one changes the totals. */
export const WORKLOAD_KEY = ['tasks', 'workload'] as const;

export const feasibilityKey = (request: FeasibilityRequest) =>
  ['feasibility', [...request.assigneeIds].sort().join(','), request.dueOn, request.estimatedMinutes, Boolean(request.urgent)] as const;

/** Each person's estimated unfinished work due by the end of this week. Totals only. */
export function fetchWorkload(): Promise<Workload> {
  return apiFetch('/api/staff/workload');
}

/** A dry run: nothing is saved. */
export function fetchFeasibility(request: FeasibilityRequest, signal?: AbortSignal): Promise<FeasibilityResponse> {
  return apiFetch('/api/tasks/feasibility', { method: 'POST', body: request, signal });
}
