'use client';

import { useEffect, useMemo, useState } from 'react';
import { PLAYER_CHARACTER, type Character } from '@/features/characters';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import type { PahlawanOutfit } from '../interfaces/outfit.interface';
import { recolouredImageUrl } from '../services/outfit-image.service';
import { isOriginalOutfit, pahlawanOutfitStore } from '../services/pahlawan-outfit.store';

interface DressedImages {
  outfit: PahlawanOutfit;
  sheet: string;
  portrait: string;
}

/**
 * The player's character in the chosen outfit colours, for the battle, the menu icon and the Pahlawan Saya preview. Until the
 * recoloured pictures are ready (a few tens of milliseconds) the pahlawan is shown as drawn.
 */
export function usePahlawanCharacter(): Character {
  const outfit = usePersistentStore(pahlawanOutfitStore);
  const [dressed, setDressed] = useState<DressedImages | null>(null);

  useEffect(() => {
    if (isOriginalOutfit(outfit)) return undefined;
    let live = true;
    Promise.all([recolouredImageUrl(PLAYER_CHARACTER.spriteSheet.src, outfit), recolouredImageUrl(PLAYER_CHARACTER.portrait, outfit)])
      .then(([sheet, portrait]) => {
        if (live) setDressed({ outfit, sheet, portrait });
      })
      .catch((error: unknown) => console.error('Could not recolour the pahlawan; showing the drawn colours.', error));
    return () => {
      live = false;
    };
  }, [outfit]);

  // A new object only when the pictures change, so the sprite's idle loop is not restarted on every render.
  return useMemo(() => {
    if (isOriginalOutfit(outfit) || dressed?.outfit !== outfit) return PLAYER_CHARACTER;
    return { ...PLAYER_CHARACTER, portrait: dressed.portrait, spriteSheet: { ...PLAYER_CHARACTER.spriteSheet, src: dressed.sheet } };
  }, [outfit, dressed]);
}
