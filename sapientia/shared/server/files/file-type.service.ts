import type { FileKind } from '@/shared/interfaces/stored-file.interface';

/**
 * Recognising uploads by their bytes (OWASP A04/A08): the browser's Content-Type and the file name are both chosen by the
 * uploader, so neither decides what a file is. Pure functions, unit-tested.
 */

export const CONTENT_TYPES: Record<FileKind, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export const EXTENSIONS: Record<FileKind, string> = { jpeg: 'jpg', png: 'png', pdf: 'pdf', docx: 'docx', xlsx: 'xlsx', pptx: 'pptx' };

/** The folder every Office Open XML file of that kind keeps its main part in. */
const OFFICE_FOLDERS: Record<'docx' | 'xlsx' | 'pptx', string> = { docx: 'word/', xlsx: 'xl/', pptx: 'ppt/' };

const startsWith = (bytes: Uint8Array, signature: readonly number[]) => signature.every((value, index) => bytes[index] === value);
const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));

function containsAscii(bytes: Uint8Array, text: string): boolean {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).includes(text, 0, 'latin1');
}

/** The file's extension in lower case, without the dot, or ''. */
function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9]{1,8})$/i.exec(fileName.trim());
  return match ? match[1].toLowerCase() : '';
}

/**
 * What the bytes are, or null. An Office file is a zip archive, so it is accepted only with a matching extension and with
 * the archive's own manifest and main folder present: a zip of anything else is refused.
 */
export function detectFileKind(bytes: Uint8Array, fileName: string): FileKind | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(bytes, ascii('%PDF-'))) return 'pdf';
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    const extension = extensionOf(fileName);
    if (extension === 'docx' || extension === 'xlsx' || extension === 'pptx') {
      if (containsAscii(bytes, '[Content_Types].xml') && containsAscii(bytes, OFFICE_FOLDERS[extension])) return extension;
    }
  }
  return null;
}

const NAME_MAX = 100;

/**
 * A name safe to store and to offer back on download: no folders, no control characters or quotes, at most 100
 * characters, ending in the extension of what the file really is.
 */
export function cleanFileName(fileName: string, kind: FileKind): string {
  const base = fileName.split(/[\\/]/).pop() ?? '';
  const extension = EXTENSIONS[kind];
  const stem = base
    .replace(/[\p{Cc}\p{Cf}"<>:*?|]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.[a-z0-9]{1,8}$/i, '')
    .replace(/^\.+/, '')
    .trim();
  const room = NAME_MAX - extension.length - 1;
  return `${stem.slice(0, room).trim() || 'fail'}.${extension}`;
}

/**
 * Content-Disposition for a download: a plain-ASCII fallback name and the real name encoded for browsers that read it.
 * Images open in place; everything else is saved, never shown inside the site.
 */
export function contentDisposition(fileName: string, contentType: string): string {
  const type = contentType === CONTENT_TYPES.jpeg || contentType === CONTENT_TYPES.png ? 'inline' : 'attachment';
  const fallback = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
