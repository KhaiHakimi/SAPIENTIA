import type { PersistentStore } from '@/shared/services/persistent-store';

/** One persistent store per pupil, so pupils who share a browser never see each other's saved board data. */
export interface PupilStoreFamily<T> {
  /** The pupil's own store; the same object every time for the same id, as useSyncExternalStore needs a stable subscribe. */
  forPupil: (studentId: string) => PersistentStore<T>;
}
