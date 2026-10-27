'use client';

import { useSyncExternalStore } from 'react';
import type { PersistentStore } from '@/shared/services/persistent-store';

/** Read a persistent store and re-render when it changes. */
export function usePersistentStore<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
