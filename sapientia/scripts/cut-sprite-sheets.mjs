/**
 * Cuts the character sprite atlases in ../Character (magenta background, text labels, rows: idle, attack, hit, die) into the
 * one-row battle sheets the app uses: public/characters/<id>/sprite-sheet.png and portrait.png.
 *
 * Frames are found from the pixels, not from the labels (some labels give the wrong count). Each frame keeps its height above
 * its row's floor, so leaps stay in the air; it is centred on its body, so a lunge does not drift out of the cell. Rows can be
 * mirrored one by one, because a few atlases draw a monster facing different ways in different rows.
 *
 * Run: node scripts/cut-sprite-sheets.mjs   (add --preview to also write previews into ../Character/preview)
 * It prints the cell size, foot line and frame ranges to copy into each features/characters/<id>/<id>.character.ts.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = path.resolve('..', 'Character');
const OUT_DIR = path.resolve('public', 'characters');
const ACTIONS = ['idle', 'attack', 'hit', 'die'];

/** mirror: per row, true flips the frames so the character faces left (monsters face the player, who stands on the left). */
const CHARACTERS = [
  { id: 'pendekar', file: 'Hang Tuah Pixel Sprite Sheet.png', mirror: [false, false, false, false] },
  { id: 'naga-laut', file: 'Naga Laut Pixel Sprite Sheet.png', mirror: [false, true, true, false] },
  { id: 'orang-bunian', file: 'Orang Bunian Forest Ogre Sprite Sheet.png', mirror: [true, true, true, true] },
  { id: 'harimau-jin', file: 'Spirit Tiger Pixel Sprite Sheet.png', mirror: [true, true, true, true] },
  { id: 'hantu-lelaki', file: 'Ghost Warrior Pixel Sprite Atlas.png', mirror: [true, true, true, true] },
];

/** Transparent space kept around the largest frame, in atlas pixels. */
const PAD = 6;
/** Labels sit in this left-hand band; small light components there are text, not art. */
const LABEL_BAND_X = 470;
/** A component this large (in pixels) is a body; smaller ones (effects, sparks, a keris) join the nearest body. */
const BODY_FRACTION = 0.2;
/** How far (atlas pixels) an effect may sit from a body and still belong to it. */
const NEAR = 40;
/**
 * 256-colour palette PNG: about a third of the size of full colour, with no visible difference on this art (checked on the
 * water effects), which matters on low-cost phones.
 */
const PNG_OUT = { palette: true, colours: 256, dither: 0, effort: 10, compressionLevel: 9 };

// ---------- pixels ----------

async function load(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** The atlas background is magenta with some noise: strong red and blue, little green. */
function isBackground(r, g, b) {
  return r > 110 && b > 110 && g < 0.6 * Math.min(r, b);
}

function foregroundMask(img) {
  const mask = new Uint8Array(img.width * img.height);
  for (let i = 0; i < mask.length; i++) {
    const o = i * 4;
    mask[i] = isBackground(img.data[o], img.data[o + 1], img.data[o + 2]) ? 0 : 1;
  }
  return mask;
}

/** 8-connected components of the mask, with their boxes, sizes and how much of them is near-white (label text). */
function components(img, mask) {
  const { width, height } = img;
  const label = new Int32Array(width * height).fill(-1);
  const found = [];
  const stack = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start] !== -1) continue;
    const id = found.length;
    const comp = { id, minX: width, minY: height, maxX: 0, maxY: 0, area: 0, white: 0 };
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop();
      const x = p % width;
      const y = (p - x) / width;
      comp.area++;
      if (x < comp.minX) comp.minX = x;
      if (x > comp.maxX) comp.maxX = x;
      if (y < comp.minY) comp.minY = y;
      if (y > comp.maxY) comp.maxY = y;
      const o = p * 4;
      if (img.data[o] > 215 && img.data[o + 1] > 215 && img.data[o + 2] > 215) comp.white++;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (mask[q] && label[q] === -1) {
            label[q] = id;
            stack.push(q);
          }
        }
      }
    }
    found.push(comp);
  }
  return { label, found };
}

// Label text is short, light and starts on the left; a title whose letters touch can still be wide.
const isText = (c) => c.minX < LABEL_BAND_X && c.maxY - c.minY < 45 && c.white / c.area > 0.2;
const isSpeck = (c) => c.area < 6;

// ---------- frames ----------

function hGap(a, b) {
  return Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX));
}
function vOverlap(a, b) {
  return Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
}
function union(a, b) {
  return { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) };
}

/** Groups art components into frames, frames into four rows (top to bottom), each row left to right. */
function findFrames(found) {
  const art = found.filter((c) => !isText(c) && !isSpeck(c));
  const biggest = Math.max(...art.map((c) => c.area));
  const bodies = art.filter((c) => c.area >= BODY_FRACTION * biggest).map((c) => ({ ...c, parts: [c.id], body: { ...c } }));

  // A body drawn in two pieces (a raised club, a separate head) overlaps itself horizontally: merge those.
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
        const narrower = Math.min(a.maxX - a.minX, b.maxX - b.minX);
        if (vOverlap(a, b) > 0 && overlapX > 0.5 * narrower) {
          bodies[i] = { ...union(a, b), parts: [...a.parts, ...b.parts], body: union(a.body, b.body), area: a.area + b.area };
          bodies.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }

  // Everything else (effects, sparks) joins the body it overlaps most, or the nearest one close by. A speck far from every
  // body is background noise and is dropped, or it would stretch a frame across the sheet.
  const taken = new Set(bodies.flatMap((b) => b.parts));
  for (const c of art) {
    if (taken.has(c.id)) continue;
    const pool = bodies.filter((b) => vOverlap(b.body, c) > -NEAR && hGap(b.body, c) <= NEAR);
    if (pool.length === 0) continue;
    let best = pool[0];
    let bestScore = Infinity;
    for (const b of pool) {
      const overlapX = Math.min(b.body.maxX, c.maxX) - Math.max(b.body.minX, c.minX);
      // Vertical distance weighs most: a spark just above a head belongs to that frame, not to the row above it.
      const vGap = Math.max(0, -vOverlap(b.body, c));
      const score = (overlapX > 0 ? -overlapX : hGap(b.body, c)) + vGap * 10;
      if (score < bestScore) {
        bestScore = score;
        best = b;
      }
    }
    Object.assign(best, union(best, c));
    best.parts.push(c.id);
  }

  // Rows: bodies whose vertical middles are close.
  const sorted = [...bodies].sort((a, b) => (a.body.minY + a.body.maxY) - (b.body.minY + b.body.maxY));
  const rows = [];
  for (const b of sorted) {
    const mid = (b.body.minY + b.body.maxY) / 2;
    const row = rows.find((r) => Math.abs(r.mid - mid) < 70);
    if (row) row.frames.push(b);
    else rows.push({ mid, frames: [b] });
  }
  if (rows.length !== 4) {
    const seen = rows.map((r) => r.frames.map((b) => `${b.body.minX},${b.body.minY}-${b.body.maxX},${b.body.maxY} (${b.area})`).join(' | '));
    throw new Error(`expected 4 rows, found ${rows.length}:\n${seen.join('\n')}`);
  }
  return rows.map((r) => r.frames.sort((a, b) => a.minX - b.minX));
}

/** One frame as RGBA, background made transparent and the magenta fringe on its edges removed. */
function extract(img, labels, frame, mirror) {
  const parts = new Set(frame.parts);
  const w = frame.maxX - frame.minX + 1;
  const h = frame.maxY - frame.minY + 1;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = frame.minX + x;
      const sy = frame.minY + y;
      const p = sy * img.width + sx;
      if (!parts.has(labels[p])) continue;
      const o = p * 4;
      let r = img.data[o];
      const g = img.data[o + 1];
      let b = img.data[o + 2];
      // Despill: take out the part of red and blue that is just background colour bleeding in.
      const spill = Math.min(r, b) - g;
      if (spill > 30) {
        r -= spill * 0.6;
        b -= spill * 0.6;
      }
      const tx = mirror ? w - 1 - x : x;
      const t = (y * w + tx) * 4;
      out[t] = r;
      out[t + 1] = g;
      out[t + 2] = b;
      out[t + 3] = 255;
    }
  }
  // Body box in frame coordinates, mirrored with the pixels.
  const bodyLeft = frame.body.minX - frame.minX;
  const bodyRight = frame.body.maxX - frame.minX;
  const body = mirror ? { left: w - 1 - bodyRight, right: w - 1 - bodyLeft } : { left: bodyLeft, right: bodyRight };
  return { pixels: out, w, h, top: frame.minY, bottom: frame.maxY, bodyBottom: frame.body.maxY, body };
}

// ---------- sheet ----------

async function cut(character, preview) {
  const img = await load(path.join(SOURCE_DIR, character.file));
  const mask = foregroundMask(img);
  const { label, found } = components(img, mask);
  const rows = findFrames(found);

  const frames = [];
  const ranges = {};
  rows.forEach((row, index) => {
    // The row's floor is the lowest body; each frame keeps its own height above it (a leap stays a leap).
    const floor = Math.max(...row.map((f) => f.body.maxY));
    ranges[ACTIONS[index]] = { first: frames.length, count: row.length };
    for (const frame of row) {
      const piece = extract(img, label, frame, character.mirror[index]);
      frames.push({
        ...piece,
        // Body feet above the floor, and how far the frame reaches above and below its own body feet (dust, splashes).
        lift: floor - piece.bodyBottom,
        upper: piece.bodyBottom - piece.top,
        lower: piece.bottom - piece.bodyBottom,
        centre: (piece.body.left + piece.body.right) / 2,
      });
    }
  });

  const footY = PAD + Math.max(...frames.map((f) => f.lift + f.upper));
  const cellH = footY + Math.max(0, ...frames.map((f) => f.lower - f.lift)) + PAD;
  const half = Math.max(...frames.map((f) => Math.max(f.centre, f.w - f.centre)));
  const cellW = Math.ceil(2 * half) + 2 * PAD;
  const footLine = footY / cellH;

  const composites = frames.map((f, i) => ({
    input: f.pixels,
    raw: { width: f.w, height: f.h, channels: 4 },
    left: Math.round(i * cellW + cellW / 2 - f.centre),
    top: footY - f.lift - f.upper,
  }));
  const dir = path.join(OUT_DIR, character.id);
  mkdirSync(dir, { recursive: true });
  const blank = { create: { width: cellW * frames.length, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } };
  // Composite first, then quantise the finished sheet (sharp applies output options to the whole image).
  const sheet = await sharp(blank).composite(composites).png().toBuffer();
  await sharp(sheet).png(PNG_OUT).toFile(path.join(dir, 'sprite-sheet.png'));

  // Portrait: the first idle frame, trimmed, facing the same way as in battle.
  const idle = frames[0];
  await sharp(idle.pixels, { raw: { width: idle.w, height: idle.h, channels: 4 } }).png(PNG_OUT)
    .toFile(path.join(dir, 'portrait.png'));

  if (preview) {
    const previewDir = path.join(SOURCE_DIR, 'preview');
    mkdirSync(previewDir, { recursive: true });
    await sharp({ create: { width: cellW * frames.length, height: cellH, channels: 4, background: { r: 40, g: 44, b: 56, alpha: 1 } } })
      .composite([{ input: path.join(dir, 'sprite-sheet.png') }])
      .png().toFile(path.join(previewDir, `${character.id}.png`));
  }

  return { id: character.id, cellWidth: cellW, cellHeight: cellH, footLine: Number(footLine.toFixed(4)), frames: ranges };
}

const preview = process.argv.includes('--preview');
for (const character of CHARACTERS) {
  const result = await cut(character, preview);
  console.log(JSON.stringify(result));
}
