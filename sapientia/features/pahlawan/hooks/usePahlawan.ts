'use client';

import { useMessages } from '@/shared/i18n/useLanguage';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { ORIGINAL_OUTFIT } from '../data/outfit-colours';
import { PAHLAWAN_MESSAGES } from '../i18n/pahlawan.messages';
import type { OutfitColourId, OutfitPart, PahlawanOutfit } from '../interfaces/outfit.interface';
import { cleanPahlawanName, pahlawanNameStore } from '../services/pahlawan-name.service';
import { pahlawanOutfitStore } from '../services/pahlawan-outfit.store';

export interface PahlawanApi {
  /** What the student typed; empty until they choose one. */
  name: string;
  /** The name to show in battle: the chosen name, or "Pahlawan" / "Warrior". */
  displayName: string;
  outfit: PahlawanOutfit;
  rename: (value: string) => void;
  setColour: (part: OutfitPart, colour: OutfitColourId) => void;
  /** Back to no name and the drawn colours. */
  reset: () => void;
}

export function usePahlawan(): PahlawanApi {
  const name = usePersistentStore(pahlawanNameStore);
  const outfit = usePersistentStore(pahlawanOutfitStore);
  const text = useMessages(PAHLAWAN_MESSAGES);
  return {
    name,
    displayName: name || text.defaultName,
    outfit,
    rename: (value) => pahlawanNameStore.set(cleanPahlawanName(value)),
    setColour: (part, colour) => pahlawanOutfitStore.set((current) => ({ ...current, [part]: colour })),
    reset: () => {
      pahlawanNameStore.set('');
      pahlawanOutfitStore.set(ORIGINAL_OUTFIT);
    },
  };
}
