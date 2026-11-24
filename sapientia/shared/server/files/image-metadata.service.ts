/**
 * Removes metadata from uploaded pictures (plan Phase 3 hard rule: no location). A phone photo's EXIF can carry the GPS
 * position where it was taken, the time, and the device. The page re-draws photos before sending them, which already drops
 * this; the server strips it again because a request need not come from the page. Pure functions, unit-tested.
 */

/** Thrown for a picture whose structure does not add up; the upload is refused as the wrong type. */
export class MalformedImageError extends Error {
  constructor() {
    super('The picture is damaged or not what it claims to be.');
    this.name = 'MalformedImageError';
  }
}

/**
 * JPEG segments kept: APP0 (JFIF), APP2 when it is the colour profile (ICC_PROFILE) and APP14 (Adobe colour transform, needed
 * to show some files correctly). Every other APPn segment (APP1 holds EXIF and XMP, APP13 holds IPTC, other APP2 segments
 * hold the MPF index of a phone's extra pictures or FlashPix data) and comments are dropped.
 */
const KEPT_APP_MARKERS = new Set([0xe0, 0xe2, 0xee]);
const ICC_PROFILE = Buffer.from('ICC_PROFILE\0', 'latin1');

const isRestart = (marker: number) => marker >= 0xd0 && marker <= 0xd7;

/** Whether this APP2 segment (starting at its marker) is a colour profile rather than an MPF index or other data. */
function isIccProfile(bytes: Uint8Array, index: number, end: number): boolean {
  const payload = bytes.subarray(index + 4, end);
  return payload.length >= ICC_PROFILE.length && Buffer.from(payload.subarray(0, ICC_PROFILE.length)).equals(ICC_PROFILE);
}

/**
 * Where a scan's compressed data ends: the first marker that is not a stuffed zero (0xFF00 stands for a data byte 0xFF) or a
 * restart marker (RSTn, part of the data). Fill bytes (0xFF repeated) before a marker are skipped. A file cut off inside the
 * scan ends at its last byte.
 */
function scanEnd(bytes: Uint8Array, from: number): number {
  let index = from;
  while (index < bytes.length - 1) {
    if (bytes[index] !== 0xff) {
      index += 1;
      continue;
    }
    const next = bytes[index + 1];
    if (next === 0x00 || isRestart(next)) index += 2;
    else if (next === 0xff) index += 1;
    else return index;
  }
  return bytes.length;
}

export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new MalformedImageError();
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let index = 2;
  while (index < bytes.length) {
    if (bytes[index] !== 0xff) throw new MalformedImageError();
    const marker = bytes[index + 1];
    if (marker === 0xff) {
      // Fill byte before a marker.
      index += 1;
      continue;
    }
    if (marker === 0xd9) {
      // End of the picture. Anything after it is not part of it: a phone puts extra pictures there (MPF), each with its own
      // EXIF and GPS position, and other tools append trailers. All of it is dropped.
      parts.push(bytes.subarray(index, index + 2));
      break;
    }
    if (isRestart(marker) || marker === 0x01) {
      parts.push(bytes.subarray(index, index + 2));
      index += 2;
      continue;
    }
    if (index + 4 > bytes.length) throw new MalformedImageError();
    const length = (bytes[index + 2] << 8) | bytes[index + 3];
    const end = index + 2 + length;
    if (length < 2 || end > bytes.length) throw new MalformedImageError();
    if (marker === 0xda) {
      // Start of scan: its header, then the compressed data, kept as they are. A progressive picture has several scans, with
      // tables between them, so the loop carries on from the marker that ends this one.
      const dataEnd = scanEnd(bytes, end);
      parts.push(bytes.subarray(index, dataEnd));
      index = dataEnd;
      continue;
    }
    const isApp = marker >= 0xe0 && marker <= 0xef;
    const dropped = (isApp && !KEPT_APP_MARKERS.has(marker)) || (marker === 0xe2 && !isIccProfile(bytes, index, end)) || marker === 0xfe;
    if (!dropped) parts.push(bytes.subarray(index, end));
    index = end;
  }
  return new Uint8Array(Buffer.concat(parts));
}

/** PNG chunks that hold text, time or EXIF; everything needed to draw the picture is kept. */
const DROPPED_PNG_CHUNKS = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);

export function stripPngMetadata(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let index = 8;
  while (index < bytes.length) {
    if (index + 12 > bytes.length) throw new MalformedImageError();
    const length = view.getUint32(index);
    const type = String.fromCharCode(...bytes.subarray(index + 4, index + 8));
    const end = index + 12 + length;
    if (end > bytes.length) throw new MalformedImageError();
    if (!DROPPED_PNG_CHUNKS.has(type)) parts.push(bytes.subarray(index, end));
    index = end;
    if (type === 'IEND') break;
  }
  return new Uint8Array(Buffer.concat(parts));
}
