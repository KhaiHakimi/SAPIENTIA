import type { OutfitColour, OutfitColourId, PahlawanOutfit } from '../interfaces/outfit.interface';

/** The six palettes from the Malay warrior sheet, each a ramp of shades from shadow to highlight. */
export const OUTFIT_COLOURS: readonly OutfitColour[] = [
  { id: 'black', name: { ms: 'Hitam', en: 'Black' }, ramp: ['#0e0d16', '#1d1c28', '#2d2c3a', '#403e4e', '#57556a'] },
  { id: 'red', name: { ms: 'Merah', en: 'Red' }, ramp: ['#2b0509', '#560c14', '#851823', '#b02a30', '#d24a44'] },
  { id: 'blue', name: { ms: 'Biru', en: 'Blue' }, ramp: ['#07122c', '#102a5e', '#1c4692', '#2d66c0', '#5089dd'] },
  { id: 'white', name: { ms: 'Putih', en: 'White' }, ramp: ['#5c5852', '#8c877e', '#b9b3a8', '#ddd8cc', '#f7f3ea'] },
  { id: 'green', name: { ms: 'Hijau', en: 'Green' }, ramp: ['#071d0c', '#0f3d1a', '#1a612b', '#2a8640', '#4aa95d'] },
  { id: 'purple', name: { ms: 'Ungu', en: 'Purple' }, ramp: ['#170827', '#301251', '#4c1f7c', '#6b33a6', '#8f55c9'] },
];

export const OUTFIT_COLOUR_IDS: readonly OutfitColourId[] = OUTFIT_COLOURS.map((colour) => colour.id);

/** How the pahlawan is drawn: black clothes and a red sampin. Choosing these leaves the picture exactly as drawn. */
export const ORIGINAL_OUTFIT: PahlawanOutfit = { clothes: 'black', sampin: 'red' };
