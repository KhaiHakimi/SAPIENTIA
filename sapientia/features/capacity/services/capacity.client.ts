import { apiFetch } from '@/shared/api/api-client';
import type { FeasibilityRequest, FeasibilityResponse } from '../interfaces/capacity.interface';

export const feasibilityKey = (request: FeasibilityRequest) =>
  ['feasibility', [...request.assigneeIds].sort().join(','), request.dueOn, request.estimatedMinutes, Boolean(request.urgent)] as const;

/** A dry run: nothing is saved. */
export function fetchFeasibility(request: FeasibilityRequest, signal?: AbortSignal): Promise<FeasibilityResponse> {
  return apiFetch('/api/tasks/feasibility', { method: 'POST', body: request, signal });
}
