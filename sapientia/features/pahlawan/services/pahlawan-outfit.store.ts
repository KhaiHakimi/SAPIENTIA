import { createPersistentStore } from '@/shared/services/persistent-store';
import { ORIGINAL_OUTFIT, OUTFIT_COLOUR_IDS } from '../data/outfit-colours';
import type { OutfitColourId, PahlawanOutfit } from '../interfaces/outfit.interface';

const isColour = (value: unknown): value is OutfitColourId => OUTFIT_COLOUR_IDS.includes(value as OutfitColourId);

/** Saved colours are checked against the palette list; anything unknown or edited falls back to the drawn colours. */
export function parseOutfit(raw: string | null): PahlawanOutfit {
  if (!raw) return ORIGINAL_OUTFIT;
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return ORIGINAL_OUTFIT;
  }
  if (!saved || typeof saved !== 'object') return ORIGINAL_OUTFIT;
  const { clothes, sampin } = saved as { clothes?: unknown; sampin?: unknown };
  return {
    clothes: isColour(clothes) ? clothes : ORIGINAL_OUTFIT.clothes,
    sampin: isColour(sampin) ? sampin : ORIGINAL_OUTFIT.sampin,
  };
}

export const isOriginalOutfit = (outfit: PahlawanOutfit): boolean =>
  outfit.clothes === ORIGINAL_OUTFIT.clothes && outfit.sampin === ORIGINAL_OUTFIT.sampin;

/** The pahlawan's outfit colours, kept in this browser like the name. */
export const pahlawanOutfitStore = createPersistentStore<PahlawanOutfit>({
  key: 'sapientia.pahlawan.outfit',
  defaultValue: ORIGINAL_OUTFIT,
  parse: parseOutfit,
  serialize: (outfit) => JSON.stringify(outfit),
});
