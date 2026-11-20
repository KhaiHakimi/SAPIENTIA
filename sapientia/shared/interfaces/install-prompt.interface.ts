/** The Chromium-only event behind the Install button; not in the DOM type library. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * unknown: not checked yet (server render). installed: running as the app. available: the browser offers an install
 * dialog. manual-ios: Safari on iPhone or iPad, installed from the Share menu. unavailable: this browser offers neither.
 */
export type InstallState = 'unknown' | 'installed' | 'available' | 'manual-ios' | 'unavailable';
