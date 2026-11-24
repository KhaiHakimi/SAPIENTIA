import type { PupilStoreFamily } from '@/shared/interfaces/pupil-store.interface';
import { removeItem } from './browser-storage.service';
import { createPersistentStore, type PersistentStore, type PersistentStoreOptions } from './persistent-store';

/** The bare key of every family. Board data was kept under these before it was kept per pupil. */
const legacyKeys = new Set<string>();

/** `<base key>:<student id>`, so each pupil's data sits under a key of its own. */
export const pupilStorageKey = (baseKey: string, studentId: string): string => `${baseKey}:${studentId}`;

/**
 * A persistent store for each pupil, created the first time that pupil's store is asked for and kept for the rest of the visit.
 * `options.key` is the base key; the pupil's id is appended to it.
 */
export function createPupilStoreFamily<T>(options: PersistentStoreOptions<T>): PupilStoreFamily<T> {
  legacyKeys.add(options.key);
  const stores = new Map<string, PersistentStore<T>>();
  return {
    forPupil(studentId) {
      let store = stores.get(studentId);
      if (!store) {
        store = createPersistentStore({ ...options, key: pupilStorageKey(options.key, studentId) });
        stores.set(studentId, store);
      }
      return store;
    },
  };
}

/**
 * Removes data saved under the bare keys. On a shared browser nobody can tell which pupil it belonged to, so it is dropped rather
 * than handed to whoever signs in next.
 */
export function removeLegacyPupilKeys(): void {
  legacyKeys.forEach((key) => removeItem(key));
}
