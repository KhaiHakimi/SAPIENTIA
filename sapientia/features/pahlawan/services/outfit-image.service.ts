import { OUTFIT_COLOURS } from '../data/outfit-colours';
import type { PahlawanOutfit } from '../interfaces/outfit.interface';
import { recolourPixels } from './outfit-recolour.service';

/**
 * Recoloured copies of the pahlawan's pictures, made in the browser on a canvas and kept as object URLs for the visit. There are at
 * most 36 outfits, and a sheet takes a few tens of milliseconds, so they are made when first needed instead of shipped as files.
 */
const cache = new Map<string, Promise<string>>();

const colourOf = (id: string) => OUTFIT_COLOURS.find((colour) => colour.id === id);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

async function recolour(src: string, outfit: PahlawanOutfit): Promise<string> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas 2D is not available');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const sampin = colourOf(outfit.sampin);
  recolourPixels(pixels.data, { clothes: colourOf(outfit.clothes)?.ramp, sampin: sampin?.sampinRamp ?? sampin?.ramp });
  context.putImageData(pixels, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error(`Could not encode the recoloured ${src}`);
  return URL.createObjectURL(blob);
}

/** The picture at `src` in the given outfit. A failed attempt is forgotten, so the next request tries again. */
export function recolouredImageUrl(src: string, outfit: PahlawanOutfit): Promise<string> {
  const key = `${src}|${outfit.clothes}|${outfit.sampin}`;
  let url = cache.get(key);
  if (!url) {
    url = recolour(src, outfit);
    url.catch(() => cache.delete(key));
    cache.set(key, url);
  }
  return url;
}
