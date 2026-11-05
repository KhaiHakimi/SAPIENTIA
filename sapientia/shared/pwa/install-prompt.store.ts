'use client';

import { useSyncExternalStore } from 'react';
import type { BeforeInstallPromptEvent, InstallState } from '@/shared/interfaces/install-prompt.interface';

/**
 * Chromium browsers fire beforeinstallprompt once, often before any page component mounts, so the event is caught here as
 * soon as the staff shell starts listening and kept for the Install button. Safari has no such event; the page shows the
 * Add to Home Screen steps instead.
 */

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = 'unknown';
let listening = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isAppleMobile = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function startInstallListener(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  state = isStandalone() ? 'installed' : isAppleMobile() ? 'manual-ios' : 'unavailable';
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    state = 'available';
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    state = 'installed';
    emit();
  });
  emit();
}

/** Shows the browser's own install dialog. Resolves true if the person accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  state = outcome === 'accepted' ? 'installed' : 'unavailable';
  emit();
  return outcome === 'accepted';
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, () => state, () => 'unknown');
}
