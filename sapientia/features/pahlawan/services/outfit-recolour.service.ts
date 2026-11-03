import type { OutfitPart } from '../interfaces/outfit.interface';

/**
 * Recolours the pahlawan's drawing, so every frame of every move changes without separate art. In the drawing the clothes (baju,
 * trousers, tengkolok) are a cool blue-grey and the sampin a strong crimson, while skin, gold trim, the keris and the outlines sit in
 * other colour ranges; the few face and hair colours that overlap the sampin's are told apart by where they are (keepRealSampin).
 * A pixel keeps how light it was and takes the matching shade of the chosen ramp.
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

/**
 * The jaw outline, skin shadows and hair are drawn in the same dark reds and purples as the sampin's shadows, so colour alone is not
 * enough there; where a pixel sits decides it. The sampin is a large patch full of bright crimson, cut into smaller pieces by its
 * gold thread; the face's reds are small patches far from it. So a sampin-coloured patch counts as sampin when it is large and
 * crimson enough, or when it lies within SAMPIN_REACH pixels of such a patch.
 */
const SAMPIN_PATCH_MIN = 200; // pixels; at this art's scale (figures about 225 px tall) a sampin is 1,000 to 2,600
const SAMPIN_CRIMSON_SHARE = 0.15;
const SAMPIN_REACH = 5;
/** Of a near-black pixel's 8 neighbours, how many must be cloth for it to count as the cloth's dark texture. */
const CLOTH_TEXTURE_NEIGHBOURS = 6;

const isCrimson = (r: number, g: number, b: number): boolean => {
  const { hue, saturation, lightness } = toHsl(r, g, b);
  return (hue >= 325 || hue <= 2) && saturation >= 0.55 && lightness >= 0.12 && lightness <= 0.42;
};

/** Neighbours of pixel p (8 directions) inside a width x height image. */
function forEachNeighbour(p: number, width: number, height: number, visit: (q: number) => void): void {
  const x = p % width;
  const y = (p - x) / width;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < width && ny < height) visit(ny * width + nx);
    }
  }
}

/** Clears `sampin` marks that are not really the sampin (see SAMPIN_PATCH_MIN). */
function keepRealSampin(data: Uint8ClampedArray | Uint8Array, sampin: Uint8Array, width: number, height: number): void {
  const patchOf = new Int32Array(sampin.length).fill(-1);
  const patches: number[][] = [];
  const reach = new Int16Array(sampin.length).fill(-1);
  const queue: number[] = [];
  for (let start = 0; start < sampin.length; start += 1) {
    if (!sampin[start] || patchOf[start] >= 0) continue;
    const members = [start];
    let crimson = 0;
    patchOf[start] = patches.length;
    for (let k = 0; k < members.length; k += 1) {
      const p = members[k];
      if (isCrimson(data[p * 4], data[p * 4 + 1], data[p * 4 + 2])) crimson += 1;
      forEachNeighbour(p, width, height, (q) => {
        if (sampin[q] && patchOf[q] < 0) {
          patchOf[q] = patches.length;
          members.push(q);
        }
      });
    }
    patches.push(members);
    if (members.length >= SAMPIN_PATCH_MIN && crimson / members.length >= SAMPIN_CRIMSON_SHARE) {
      for (const p of members) {
        reach[p] = 0;
        queue.push(p);
      }
    }
  }
  // Spread outwards from the real sampin patches, SAMPIN_REACH pixels in every direction.
  for (let k = 0; k < queue.length; k += 1) {
    const p = queue[k];
    if (reach[p] >= SAMPIN_REACH) continue;
    forEachNeighbour(p, width, height, (q) => {
      if (reach[q] < 0) {
        reach[q] = reach[p] + 1;
        queue.push(q);
      }
    });
  }
  for (const members of patches) {
    if (!members.some((p) => reach[p] >= 0)) for (const p of members) sampin[p] = 0;
  }
}

/** Recolours RGBA pixel data of a `width`-pixel-wide picture in place. Fully transparent pixels are skipped. */
export function recolourPixels(data: Uint8ClampedArray | Uint8Array, width: number, ramps: PartRamps): void {
  const count = data.length / 4;
  const height = count / width;
  const parts: (OutfitPart | null)[] = new Array(count).fill(null);
  // The drawing has about 255 colours, so each is classified once.
  const classified = new Map<number, OutfitPart | null>();
  for (let p = 0; p < count; p += 1) {
    const i = p * 4;
    if (data[i + 3] === 0) continue;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let part = classified.get(key);
    if (part === undefined) {
      part = partOf(data[i], data[i + 1], data[i + 2]);
      classified.set(key, part);
    }
    parts[p] = part;
  }
  if (ramps.clothes) {
    // The cloth's darkest texture is as dark as the outlines, so partOf leaves it alone; on light clothes it shows as stains. A
    // near-black pixel with cloth on almost every side is texture, not an outline (outlines border the background, skin or trim).
    const texture: number[] = [];
    for (let p = 0; p < count; p += 1) {
      if (parts[p] || data[p * 4 + 3] === 0 || toHsl(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]).lightness >= 0.04) continue;
      let cloth = 0;
      forEachNeighbour(p, width, height, (q) => {
        if (parts[q] === 'clothes') cloth += 1;
      });
      if (cloth >= CLOTH_TEXTURE_NEIGHBOURS) texture.push(p);
    }
    for (const p of texture) parts[p] = 'clothes';
  }
  if (ramps.sampin) {
    const sampin = Uint8Array.from(parts, (part) => (part === 'sampin' ? 1 : 0));
    keepRealSampin(data, sampin, width, height);
    for (let p = 0; p < count; p += 1) if (parts[p] === 'sampin' && !sampin[p]) parts[p] = null;
  }
  for (let p = 0; p < count; p += 1) {
    const part = parts[p];
    const ramp = part ? ramps[part] : undefined;
    if (!part || !ramp) continue;
    const i = p * 4;
    const [darkest, lightest] = LIGHTNESS_RANGE[part];
    const { lightness } = toHsl(data[i], data[i + 1], data[i + 2]);
    [data[i], data[i + 1], data[i + 2]] = rampAt(ramp, (lightness - darkest) / (lightest - darkest));
  }
}
