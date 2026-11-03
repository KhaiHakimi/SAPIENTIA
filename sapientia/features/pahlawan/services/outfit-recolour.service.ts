import type { OutfitPart } from '../interfaces/outfit.interface';

/**
 * Recolours the pahlawan's drawing by colour alone, so every frame of every move changes without separate art. In the drawing the
 * clothes (baju, trousers, tengkolok) are a cool blue-grey and the sampin a strong crimson, while skin, hair, gold trim, the keris and
 * the outlines all sit in other colour ranges. A pixel keeps how light it was and takes the matching shade of the chosen ramp.
 */

/** Ramps per part; a part left out is not touched. */
export type PartRamps = Partial<Record<OutfitPart, readonly string[]>>;

interface Hsl {
  hue: number;
  saturation: number;
  lightness: number;
}

/** The lightness each part spans in the drawing, so its darkest shadow maps to the ramp's first shade and its highlight to the last. */
const LIGHTNESS_RANGE: Record<OutfitPart, [number, number]> = { clothes: [0.05, 0.28], sampin: [0.04, 0.42] };

function toHsl(r: number, g: number, b: number): Hsl {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return { hue: 0, saturation: 0, lightness };
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let sector = (red - green) / delta + 4;
  if (max === red) sector = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) sector = (blue - red) / delta + 2;
  return { hue: sector * 60, saturation, lightness };
}

/** Which recolourable part a pixel belongs to, or null for skin, hair, gold, metal and outlines. */
export function partOf(r: number, g: number, b: number): OutfitPart | null {
  const { hue, saturation, lightness } = toHsl(r, g, b);
  if (lightness < 0.04) return null; // outlines and the deepest shadow stay as drawn
  if (hue >= 200 && hue <= 290 && saturation <= 0.35 && lightness <= 0.3) return 'clothes';
  if ((hue >= 300 || hue <= 12) && saturation >= 0.45 && lightness <= 0.45) return 'sampin';
  return null;
}

const parseHex = (hex: string): [number, number, number] =>
  [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as [number, number, number];

/** The colour at position 0..1 along a ramp, blending between neighbouring shades. */
export function rampAt(ramp: readonly string[], position: number): [number, number, number] {
  const scaled = Math.min(1, Math.max(0, position)) * (ramp.length - 1);
  const low = Math.floor(scaled);
  const high = Math.min(ramp.length - 1, low + 1);
  const mix = scaled - low;
  const from = parseHex(ramp[low]);
  const to = parseHex(ramp[high]);
  return [0, 1, 2].map((channel) => Math.round(from[channel] + (to[channel] - from[channel]) * mix)) as [number, number, number];
}

/** Recolours RGBA pixel data in place. Fully transparent pixels are skipped. */
export function recolourPixels(data: Uint8ClampedArray | Uint8Array, ramps: PartRamps): void {
  // The drawing has about 255 colours, so each is worked out once.
  const cache = new Map<number, [number, number, number] | null>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let colour = cache.get(key);
    if (colour === undefined) {
      const part = partOf(data[i], data[i + 1], data[i + 2]);
      const ramp = part ? ramps[part] : undefined;
      if (part && ramp) {
        const [darkest, lightest] = LIGHTNESS_RANGE[part];
        colour = rampAt(ramp, (toHsl(data[i], data[i + 1], data[i + 2]).lightness - darkest) / (lightest - darkest));
      } else {
        colour = null;
      }
      cache.set(key, colour);
    }
    if (colour) [data[i], data[i + 1], data[i + 2]] = colour;
  }
}
