import { registerServiceWorker } from '@/shared/pwa/service-worker.client';
import type { PushSubscriptionInput } from '../interfaces/notification.interface';
import { deleteSubscription, saveSubscription } from './notifications.client';

/** Push on this browser: ask permission, subscribe with the server's public key, and tell the server; or undo all that. */

export function supportsPush(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** The VAPID public key is base64url; PushManager wants the raw bytes. */
function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

function toInput(subscription: PushSubscription): PushSubscriptionInput {
  const json = subscription.toJSON();
  return { endpoint: subscription.endpoint, keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' } };
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!supportsPush()) return null;
  const registration = await registerServiceWorker();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** Resolves 'denied' when the person (or the browser) refused permission; nothing is saved then. */
export async function enablePush(publicKey: string): Promise<'on' | 'denied'> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const registration = await registerServiceWorker();
  if (!registration) throw new Error('Service worker unavailable.');
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  await saveSubscription(toInput(subscription));
  return 'on';
}

/** Tells the server first (while still signed in), then drops the browser's subscription. */
export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await deleteSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}
