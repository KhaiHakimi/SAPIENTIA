/**
 * Makes the PWA icons from public/brand/sapientia-logo.jpg (plan Sprint 5). Run again if the logo changes:
 *   node scripts/make-app-icons.mjs
 * Writes public/icons/{icon-192,icon-512,maskable-512,badge-96,apple-touch-icon}.png (the last is linked in app/layout.tsx).
 */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = `${root}public/brand/sapientia-logo.jpg`;
const outDir = `${root}public/icons`;
// The calm scope's dark background, so the padding around a maskable icon matches the app's splash screen.
const BACKGROUND = '#12151b';
// 256-colour palette PNGs: a fraction of the size of full colour, which matters on low-cost phones (plan Section 14).
const PNG = { compressionLevel: 9, palette: true, quality: 90 };

async function plain(size, file) {
  await sharp(source).resize(size, size, { fit: 'cover' }).png(PNG).toFile(file);
}

/** Android crops maskable icons to a circle or squircle: keep the logo inside the central 80% safe zone. */
async function maskable(size, file) {
  const inner = Math.round(size * 0.8);
  const logo = await sharp(source).resize(inner, inner, { fit: 'cover' }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png(PNG)
    .toFile(file);
}

/** Android draws the badge as a white silhouette from the alpha channel; a light-on-transparent version reads best. */
async function badge(size, file) {
  const { data, info } = await sharp(source).resize(size, size, { fit: 'cover' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let index = 0; index < info.width * info.height; index++) {
    rgba[index * 4] = 255;
    rgba[index * 4 + 1] = 255;
    rgba[index * 4 + 2] = 255;
    rgba[index * 4 + 3] = data[index * info.channels];
  }
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png(PNG).toFile(file);
}

await mkdir(outDir, { recursive: true });
await plain(192, `${outDir}/icon-192.png`);
await plain(512, `${outDir}/icon-512.png`);
await maskable(512, `${outDir}/maskable-512.png`);
await badge(96, `${outDir}/badge-96.png`);
await plain(180, `${outDir}/apple-touch-icon.png`);
console.log('Icons written to public/icons (including apple-touch-icon.png).');
