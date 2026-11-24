import { readItem, removeItem, writeItem } from './browser-storage.service';

export interface PersistentStoreOptions<T> {
  key: string;
  defaultValue: T;
  /** Turn the stored string into a value; must reject anything invalid by returning the default. */
  parse: (raw: string | null) => T;
  serialize: (value: T) => string;
}

export interface PersistentStore<T> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  /** Returns false when the browser would not keep the value (private mode, full storage); it still holds until a reload. */
  set: (next: T | ((current: T) => T)) => boolean;
  clear: () => void;
}

/**
 * A value kept in localStorage that React components read with useSyncExternalStore. The server and the first client render
 * both see the default, so hydration always matches; the stored value is read lazily on the client after that.
 */
export function createPersistentStore<T>(options: PersistentStoreOptions<T>): PersistentStore<T> {
  const listeners = new Set<() => void>();
  let value: T = options.defaultValue;
  let loaded = false;

  const notify = () => listeners.forEach((listener) => listener());
  const getSnapshot = () => {
    if (!loaded) {
      loaded = true;
      value = options.parse(readItem(options.key));
    }
    return value;
  };

  // Another tab changed the value (a purchase, a new photo). Re-read it, or this tab's next write would undo that change.
  // A null key means the other tab cleared all of storage.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== options.key) return;
    value = options.parse(readItem(options.key));
    loaded = true;
    notify();
  };

  return {
    subscribe(listener) {
      if (listeners.size === 0) window.addEventListener('storage', onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener('storage', onStorage);
      };
    },
    getSnapshot,
    getServerSnapshot() {
      return options.defaultValue;
    },
    set(next) {
      const current = getSnapshot();
      value = typeof next === 'function' ? (next as (current: T) => T)(current) : next;
      const kept = writeItem(options.key, options.serialize(value));
      notify();
      return kept;
    },
    clear() {
      value = options.defaultValue;
      loaded = true;
      removeItem(options.key);
      notify();
    },
  };
}
