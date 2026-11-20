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
 * JPEG segments kept: APP0 (JFIF), APP2 (colour profile) and APP14 (Adobe colour transform, needed to show some files
 * correctly). Every other APPn segment (APP1 holds EXIF and XMP, APP13 holds IPTC) and comments are dropped.
 */
const KEPT_APP_MARKERS = new Set([0xe0, 0xe2, 0xee]);

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
    if (marker === 0xda) {
      // Start of scan: the compressed picture follows, then the end marker. Kept as it is.
      parts.push(bytes.subarray(index));
      break;
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xd9) {
      parts.push(bytes.subarray(index, index + 2));
      index += 2;
      continue;
    }
    if (index + 4 > bytes.length) throw new MalformedImageError();
    const length = (bytes[index + 2] << 8) | bytes[index + 3];
    const end = index + 2 + length;
    if (length < 2 || end > bytes.length) throw new MalformedImageError();
    const isApp = marker >= 0xe0 && marker <= 0xef;
    const dropped = (isApp && !KEPT_APP_MARKERS.has(marker)) || marker === 0xfe;
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
