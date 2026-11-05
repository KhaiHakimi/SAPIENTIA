/** Browser-only helpers for the service worker in public/sw.js. */

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

export function supportsServiceWorker(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Registers /sw.js once per page load. A failure is logged and resolves null: the app works without it, only push and the
 * install prompt are lost.
 */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!supportsServiceWorker()) return Promise.resolve(null);
  registration ??= navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .catch((error: unknown) => {
      console.error('Service worker registration failed', error);
      registration = null;
      return null;
    });
  return registration;
}
