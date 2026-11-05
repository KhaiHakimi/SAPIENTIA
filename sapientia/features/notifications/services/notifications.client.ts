import { apiFetch } from '@/shared/api/api-client';
import type { NotificationSettings, PushSubscriptionInput } from '../interfaces/notification.interface';

export const NOTIFICATION_SETTINGS_KEY = ['me', 'notifications'] as const;

export function fetchNotificationSettings(): Promise<NotificationSettings> {
  return apiFetch('/api/me/notifications');
}

export function saveEmailChoice(email: boolean): Promise<NotificationSettings> {
  return apiFetch('/api/me/notifications', { method: 'PATCH', body: { email } });
}

export function saveSubscription(subscription: PushSubscriptionInput): Promise<void> {
  return apiFetch('/api/me/push-subscriptions', { method: 'POST', body: subscription });
}

export function deleteSubscription(endpoint: string): Promise<void> {
  return apiFetch('/api/me/push-subscriptions', { method: 'DELETE', body: { endpoint } });
}
