import { apiFetch } from '@/shared/api/api-client';
import type { HoursEntry, HoursMonth, HoursShare, NewHoursEntry } from '../interfaces/hours.interface';

export const hoursMonthKey = (month: string) => ['hours', month] as const;

export function fetchHoursMonth(month: string): Promise<HoursMonth> {
  return apiFetch(`/api/me/hours?month=${encodeURIComponent(month)}`);
}

export function addHoursEntry(entry: NewHoursEntry): Promise<HoursEntry> {
  return apiFetch('/api/me/hours', { method: 'POST', body: entry });
}

export function deleteHoursEntry(id: string): Promise<void> {
  return apiFetch(`/api/me/hours/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function shareHoursMonth(month: string): Promise<HoursShare> {
  return apiFetch('/api/me/hours/share', { method: 'PUT', body: { month } });
}

export function withdrawHoursShare(month: string): Promise<void> {
  return apiFetch(`/api/me/hours/share?month=${encodeURIComponent(month)}`, { method: 'DELETE' });
}
