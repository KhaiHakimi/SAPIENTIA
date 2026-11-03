import type { LocalizedText } from '@/shared/interfaces/localized-text.interface';

export type OutfitColourId = 'black' | 'red' | 'blue' | 'white' | 'green' | 'purple';

/** The two parts of the pahlawan's clothes that can be recoloured separately. */
export type OutfitPart = 'clothes' | 'sampin';

export interface OutfitColour {
  id: OutfitColourId;
  name: LocalizedText;
  /** Shades from darkest to lightest; a recoloured pixel takes the shade matching how light it was. */
  ramp: readonly string[];
}

/** The pahlawan's chosen colours: baju, trousers and tengkolok together, and the sampin on its own. */
export type PahlawanOutfit = Record<OutfitPart, OutfitColourId>;
