'use client';

import { usePupilStore } from '@/shared/components/PupilStoreProvider';
import { useMessages } from '@/shared/i18n/useLanguage';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { ORIGINAL_OUTFIT } from '../data/outfit-colours';
import { PAHLAWAN_MESSAGES } from '../i18n/pahlawan.messages';
import type { OutfitColourId, OutfitPart, PahlawanOutfit } from '../interfaces/outfit.interface';
import { cleanPahlawanName, pahlawanNameStores } from '../services/pahlawan-name.service';
import { pahlawanOutfitStores } from '../services/pahlawan-outfit.store';

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
  const nameStore = usePupilStore(pahlawanNameStores);
  const outfitStore = usePupilStore(pahlawanOutfitStores);
  const name = usePersistentStore(nameStore);
  const outfit = usePersistentStore(outfitStore);
  const text = useMessages(PAHLAWAN_MESSAGES);
  return {
    name,
    displayName: name || text.defaultName,
    outfit,
    rename: (value) => nameStore.set(cleanPahlawanName(value)),
    setColour: (part, colour) => outfitStore.set((current) => ({ ...current, [part]: colour })),
    reset: () => {
      nameStore.set('');
      outfitStore.set(ORIGINAL_OUTFIT);
    },
  };
}
