/**
 * Cuts the baju and sampin pictures out of ../Character/Malay Warrior Pixel Art Sprite Sheet.png into the swatch icons of the
 * Pahlawan Saya colour picker: public/pahlawan/outfit/<part>-<colour>.png.
 *
 * The sheet's pixels are all partly transparent, with a faint haze around the art; anything below ALPHA_SOLID is dropped and the
 * rest made solid. Each row holds six evenly spaced items in the sheet's colour order; it is split at the emptiest column near
 * each sixth, then each item is trimmed to its pixels.
 *
 * Run: node scripts/cut-outfit-icons.mjs
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE = path.resolve('..', 'Character', 'Malay Warrior Pixel Art Sprite Sheet.png');
const OUT_DIR = path.resolve('public', 'pahlawan', 'outfit');
/** The colours left to right on the sheet, matching features/pahlawan/data/outfit-colours.ts. */
const COLOURS = ['black', 'red', 'blue', 'white', 'green', 'purple'];
/** Where each row of items sits on the sheet (the labels above them are left out). */
const ROWS = [
  { part: 'clothes', left: 1055, top: 45, width: 480, height: 150 },
  { part: 'sampin', left: 10, top: 260, width: 480, height: 130 },
];
const ALPHA_SOLID = 200;
/** Icons are square, with this much transparent space round the item. */
const PAD = 4;
/** How far either side of each sixth of the row to look for the gap between two items. */
const SEARCH = 30;

async function cutRow({ part, ...box }) {
  const { data, info } = await sharp(SOURCE).extract(box).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] >= ALPHA_SOLID ? 255 : 0;
  const solid = (x, y) => data[(y * info.width + x) * 4 + 3] > 0;
  const columnFill = Array.from({ length: info.width }, (_, x) =>
    Array.from({ length: info.height }, (__, y) => solid(x, y)).filter(Boolean).length);

  // The items are evenly spaced but some touch (the baju sleeves), so cut at the emptiest column near each expected boundary.
  const cuts = [0];
  for (let k = 1; k < COLOURS.length; k += 1) {
    const expected = Math.round((info.width * k) / COLOURS.length);
    let best = expected;
    for (let x = expected - SEARCH; x <= expected + SEARCH; x += 1) if (columnFill[x] < columnFill[best]) best = x;
    cuts.push(best);
  }
  cuts.push(info.width);
  const items = COLOURS.map((_, index) => {
    const used = columnFill.map((fill, x) => (x >= cuts[index] && x < cuts[index + 1] && fill > 0 ? x : -1)).filter((x) => x >= 0);
    if (used.length === 0) throw new Error(`${part}: nothing found for ${COLOURS[index]}`);
    return { from: used[0], to: used[used.length - 1] };
  });

  for (const [index, span] of items.entries()) {
    let top = info.height;
    let bottom = 0;
    for (let y = 0; y < info.height; y += 1) {
      for (let x = span.from; x <= span.to; x += 1) {
        if (solid(x, y)) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }
    const width = span.to - span.from + 1;
    const height = bottom - top + 1;
    const side = Math.max(width, height) + PAD * 2;
    const item = await sharp(data, { raw: info }).extract({ left: span.from, top, width, height }).png().toBuffer();
    const file = path.join(OUT_DIR, `${part}-${COLOURS[index]}.png`);
    await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: item, left: Math.round((side - width) / 2), top: Math.round((side - height) / 2) }])
      .png({ palette: true })
      .toFile(file);
    console.log(path.relative(process.cwd(), file), `${side}x${side}`);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
for (const row of ROWS) await cutRow(row);
