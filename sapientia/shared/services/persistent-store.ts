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
  set: (next: T | ((current: T) => T)) => void;
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

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot,
    getServerSnapshot() {
      return options.defaultValue;
    },
    set(next) {
      const current = getSnapshot();
      value = typeof next === 'function' ? (next as (current: T) => T)(current) : next;
      writeItem(options.key, options.serialize(value));
      notify();
    },
    clear() {
      value = options.defaultValue;
      loaded = true;
      removeItem(options.key);
      notify();
    },
  };
}
