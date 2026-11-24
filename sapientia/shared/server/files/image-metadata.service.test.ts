import { describe, expect, it } from 'vitest';
import {
  GPS_MARKER, jpegSegment, jpegWithExif, pngWithText, SAMPLE_JPEG, SAMPLE_PNG,
} from '@/shared/server/testing/sample-images';
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

  it('drops a phone\'s secondary picture after the end marker, with its EXIF, and the MPF index that points at it', () => {
    const icc = jpegSegment(0xe2, 'ICC_PROFILE\0\x01\x01colour data');
    const mpf = jpegSegment(0xe2, 'MPF\0II*\0offsets of the extra pictures');
    const primary = Buffer.concat([Buffer.from(SAMPLE_JPEG.subarray(0, 2)), icc, mpf, Buffer.from(SAMPLE_JPEG.subarray(2))]);
    const phoneFile = new Uint8Array(Buffer.concat([primary, Buffer.from(jpegWithExif()), Buffer.from(`trailer ${GPS_MARKER}`, 'latin1')]));
    expect(text(phoneFile)).toContain(GPS_MARKER);

    const stripped = Buffer.from(stripJpegMetadata(phoneFile));
    expect(text(stripped)).not.toContain(GPS_MARKER);
    expect(text(stripped)).not.toContain('MPF');
    // The colour profile stays; otherwise the primary picture is the sample exactly.
    const expected = Buffer.concat([Buffer.from(SAMPLE_JPEG.subarray(0, 2)), icc, Buffer.from(SAMPLE_JPEG.subarray(2))]);
    expect(stripped.equals(expected)).toBe(true);
  });

  it('reads through stuffed bytes, restart markers and a second scan to the real end of the picture', () => {
    const scanHeader = jpegSegment(0xda, '\x01\x01\x00\x00\x3f\x00');
    // 0xFF00 is a data byte, 0xFFD0 a restart marker, and 0xFF 0xFF a fill byte before the next marker: none ends the scan.
    const firstScan = Buffer.from([0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56, 0xff]);
    const secondScan = Buffer.from([0x78, 0xff, 0x00, 0xff, 0xd7, 0x9a]);
    const picture = Buffer.concat([
      Buffer.from([0xff, 0xd8]), jpegSegment(0xdb, 'quantisation table'), scanHeader, firstScan,
      jpegSegment(0xc4, 'huffman table'), scanHeader, secondScan, Buffer.from([0xff, 0xd9]),
    ]);
    const tagged = new Uint8Array(Buffer.concat([picture, jpegSegment(0xe1, `Exif\0\0${GPS_MARKER}`), Buffer.from([0xff, 0xd9])]));
    expect(Buffer.from(stripJpegMetadata(tagged)).equals(picture)).toBe(true);
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
