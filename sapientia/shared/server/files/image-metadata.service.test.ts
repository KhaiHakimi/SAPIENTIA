import { describe, expect, it } from 'vitest';
import { GPS_MARKER, jpegWithExif, pngWithText, SAMPLE_JPEG, SAMPLE_PNG } from '@/shared/server/testing/sample-images';
import { MalformedImageError, stripJpegMetadata, stripPngMetadata } from './image-metadata.service';

const text = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

describe('stripJpegMetadata', () => {
  it('removes EXIF and comments and leaves the picture exactly as it was', () => {
    const tagged = jpegWithExif();
    expect(text(tagged)).toContain(GPS_MARKER);
    const stripped = stripJpegMetadata(tagged);
    expect(text(stripped)).not.toContain(GPS_MARKER);
    expect(text(stripped)).not.toContain('Taken on Phone X');
    // The sample has no metadata of its own, so stripping gives back the original file byte for byte.
    expect(Buffer.from(stripped).equals(Buffer.from(SAMPLE_JPEG))).toBe(true);
  });

  it('keeps the JFIF header', () => {
    expect(text(stripJpegMetadata(SAMPLE_JPEG)).slice(6, 10)).toBe('JFIF');
  });

  it('refuses something that only starts like a JPEG', () => {
    expect(() => stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00]))).toThrow(MalformedImageError);
    expect(() => stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0x00, 0x00]))).toThrow(MalformedImageError);
    // A segment claiming to run past the end of the file.
    expect(() => stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x7f, 0xff, 0x00]))).toThrow(MalformedImageError);
  });
});

describe('stripPngMetadata', () => {
  it('removes text chunks and leaves the picture exactly as it was', () => {
    const tagged = pngWithText();
    expect(text(tagged)).toContain(GPS_MARKER);
    const stripped = stripPngMetadata(tagged);
    expect(text(stripped)).not.toContain(GPS_MARKER);
    expect(Buffer.from(stripped).equals(Buffer.from(SAMPLE_PNG))).toBe(true);
  });

  it('refuses a cut-off PNG', () => {
    expect(() => stripPngMetadata(SAMPLE_PNG.subarray(0, 40))).toThrow(MalformedImageError);
  });
});
