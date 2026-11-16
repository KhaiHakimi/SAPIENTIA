/**
 * Tiny real pictures for tests (8 x 8 pixels, made with Windows' imaging library), and helpers that add the kind of metadata
 * a phone writes, so tests can show it is removed. Only test files import this.
 */
const fromBase64 = (base64: string) => new Uint8Array(Buffer.from(base64, 'base64'));

export const SAMPLE_JPEG = fromBase64(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQ'
  + 'MEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEB'
  + 'AQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3'
  + 'ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo'
  + '6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMz'
  + 'UvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6'
  + 'wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDhvhb+y9/qf9E9P4aKKK+UzTiXMvrL/eHocA8XZv8A2JT/AHn9fef/2Q==',
);

export const SAMPLE_PNG = fromBase64(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAB9SURBVChTFcpBEQAw'
  + 'CMAwlKAEJSipEpSgBEPdLe9EBGZgBXYggRO4gRcYkZiJldiJJE7iJl7+UJiFVdiFFE7hFl790JiN1diNNE7jNl7/ACZYYIOAAy54/DCYgzXYgwzO4A7e/LCYi7XYiyzO'
  + '4i7e/nCYh3XYhxzO4R7e4QODE5JBWzalfgAAAABJRU5ErkJggg==',
);

/** Text that stands for a phone's GPS position: if it survives an upload, metadata was not removed. */
export const GPS_MARKER = 'GPSLatitude 3.1390 N';

const segment = (marker: number, payload: string) => {
  const body = Buffer.from(payload, 'latin1');
  return Buffer.concat([Buffer.from([0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff]), body]);
};

/** The JPEG with an EXIF segment (APP1) and a comment, as a phone camera writes them, straight after the start marker. */
export function jpegWithExif(jpeg: Uint8Array = SAMPLE_JPEG): Uint8Array {
  const bytes = Buffer.from(jpeg);
  return new Uint8Array(Buffer.concat([
    bytes.subarray(0, 2), segment(0xe1, `Exif\0\0${GPS_MARKER}`), segment(0xfe, 'Taken on Phone X'), bytes.subarray(2),
  ]));
}

/** The PNG with a tEXt chunk holding the marker, before its end chunk. The CRC is not checked by the stripper. */
export function pngWithText(png: Uint8Array = SAMPLE_PNG): Uint8Array {
  const bytes = Buffer.from(png);
  const text = Buffer.from(`Comment\0${GPS_MARKER}`, 'latin1');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(text.length);
  const chunk = Buffer.concat([length, Buffer.from('tEXt', 'latin1'), text, Buffer.alloc(4)]);
  return new Uint8Array(Buffer.concat([bytes.subarray(0, bytes.length - 12), chunk, bytes.subarray(bytes.length - 12)]));
}
