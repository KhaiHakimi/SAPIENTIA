/**
 * Safe access to localStorage. Private browsing, blocked site data or a full quota make the storage calls throw; the dashboard
 * then simply does not remember the choice, so every failure is reported to the caller as "nothing stored" instead of crashing.
 */

export function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Returns false when the value could not be kept. */
export function writeItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing was stored, so there is nothing to remove.
  }
}

/** Parse stored JSON; unreadable or edited data counts as missing. */
export function readJson(key: string): unknown {
  const raw = readItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
