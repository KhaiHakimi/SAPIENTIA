'use client';

import { useMessages } from '@/shared/i18n/useLanguage';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { PAHLAWAN_MESSAGES } from '../i18n/pahlawan.messages';
import { cleanPahlawanName, pahlawanNameStore } from '../services/pahlawan-name.service';

export interface PahlawanApi {
  /** What the student typed; empty until they choose one. */
  name: string;
  /** The name to show in battle: the chosen name, or "Pahlawan" / "Warrior". */
  displayName: string;
  rename: (value: string) => void;
  resetName: () => void;
}

export function usePahlawan(): PahlawanApi {
  const name = usePersistentStore(pahlawanNameStore);
  const text = useMessages(PAHLAWAN_MESSAGES);
  return {
    name,
    displayName: name || text.defaultName,
    rename: (value) => pahlawanNameStore.set(cleanPahlawanName(value)),
    resetName: () => pahlawanNameStore.set(''),
  };
}
