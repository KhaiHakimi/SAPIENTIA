import { apiFetch } from '@/shared/api/api-client';
import type { NewRelief, ReliefAssigned, ReliefDay, ReliefDuty, ReliefSuggestions } from '../interfaces/relief.interface';

export const RELIEF_KEY = ['relief'] as const;
export const MY_RELIEF_KEY = ['relief', 'mine'] as const;
export const reliefDayKey = (teacherId: string, onDate: string) => ['relief', 'day', teacherId, onDate] as const;
export const reliefSuggestionsKey = (slotId: string, onDate: string) => ['relief', 'suggestions', slotId, onDate] as const;

export async function fetchMyReliefDuties(): Promise<ReliefDuty[]> {
  return (await apiFetch<{ items: ReliefDuty[] }>('/api/relief/mine')).items;
}

export function fetchReliefDay(teacherId: string, onDate: string): Promise<ReliefDay> {
  return apiFetch(`/api/relief?teacherId=${encodeURIComponent(teacherId)}&onDate=${encodeURIComponent(onDate)}`);
}

export function fetchReliefSuggestions(slotId: string, onDate: string): Promise<ReliefSuggestions> {
  return apiFetch(`/api/relief/suggestions?slotId=${encodeURIComponent(slotId)}&onDate=${encodeURIComponent(onDate)}`);
}

export function assignRelief(input: NewRelief): Promise<ReliefAssigned> {
  return apiFetch('/api/relief', { method: 'POST', body: input });
}

export function cancelRelief(id: string): Promise<void> {
  return apiFetch(`/api/relief/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
