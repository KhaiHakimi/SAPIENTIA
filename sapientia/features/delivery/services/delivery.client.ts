import { apiFetch } from '@/shared/api/api-client';
import type { CalendarEvent, CalendarEventKind, DeliveryPreview, SchoolSettings } from '../interfaces/working-calendar.interface';

export const SETTINGS_KEY = ['school', 'settings'] as const;
export const CALENDAR_KEY = ['school', 'calendar'] as const;
export const PREVIEW_KEY = ['delivery', 'preview'] as const;

export function fetchSettings(): Promise<SchoolSettings> {
  return apiFetch('/api/school/settings');
}

export function saveSettings(patch: Partial<Omit<SchoolSettings, 'timeZone'>>): Promise<SchoolSettings> {
  return apiFetch('/api/school/settings', { method: 'PATCH', body: patch });
}

export async function fetchCalendar(): Promise<CalendarEvent[]> {
  return (await apiFetch<{ items: CalendarEvent[] }>('/api/calendar/events')).items;
}

export function addCalendarEvent(input: { onDate: string; kind: CalendarEventKind; title: string }): Promise<CalendarEvent> {
  return apiFetch('/api/calendar/events', { method: 'POST', body: input });
}

export function removeCalendarEvent(id: string): Promise<void> {
  return apiFetch(`/api/calendar/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchDeliveryPreview(): Promise<DeliveryPreview> {
  return apiFetch('/api/delivery/preview');
}
