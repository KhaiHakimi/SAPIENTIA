'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { PupilStoreFamily } from '@/shared/interfaces/pupil-store.interface';
import type { PersistentStore } from '@/shared/services/persistent-store';
import { removeLegacyPupilKeys } from '@/shared/services/pupil-store';

const PupilIdContext = createContext<string | null>(null);

interface PupilStoreProviderProps {
  /** The signed-in pupil; every per-pupil store below reads and writes that pupil's keys only. */
  studentId: string;
  children: ReactNode;
}

/** Ties the board's saved data (photo, shop, battles, pahlawan) to the signed-in pupil. */
export function PupilStoreProvider({ studentId, children }: PupilStoreProviderProps) {
  useEffect(() => {
    removeLegacyPupilKeys();
  }, []);
  return <PupilIdContext.Provider value={studentId}>{children}</PupilIdContext.Provider>;
}

/** The signed-in pupil's store from a family; read it with usePersistentStore. */
export function usePupilStore<T>(family: PupilStoreFamily<T>): PersistentStore<T> {
  const studentId = useContext(PupilIdContext);
  if (!studentId) throw new Error('usePupilStore must be used inside <PupilStoreProvider>.');
  return family.forPupil(studentId);
}
