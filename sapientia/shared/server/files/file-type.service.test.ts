import { describe, expect, it } from 'vitest';
import { SAMPLE_JPEG, SAMPLE_PNG } from '@/shared/server/testing/sample-images';
import { cleanFileName, contentDisposition, CONTENT_TYPES, detectFileKind } from './file-type.service';

const bytesOf = (text: string) => new Uint8Array(Buffer.from(text, 'latin1'));
/** Enough of a zip archive to show what an Office file's first entries look like. */
const officeZip = (folder: string) => bytesOf(`PK\x03\x04....[Content_Types].xml....${folder}document.xml`);

describe('detectFileKind', () => {
  it('knows pictures and PDFs by their bytes, whatever they are called', () => {
    expect(detectFileKind(SAMPLE_JPEG, 'gambar.png')).toBe('jpeg');
    expect(detectFileKind(SAMPLE_PNG, 'notes.pdf')).toBe('png');
    expect(detectFileKind(bytesOf('%PDF-1.7\n...'), 'nota')).toBe('pdf');
  });

  it('accepts an Office file only with the right extension and its own folders inside', () => {
    expect(detectFileKind(officeZip('word/'), 'Lembaran Kerja.docx')).toBe('docx');
    expect(detectFileKind(officeZip('ppt/'), 'Slaid.PPTX')).toBe('pptx');
    expect(detectFileKind(officeZip('xl/'), 'Markah.xlsx')).toBe('xlsx');
    // A Word file renamed to look like slides, or a zip of anything else.
    expect(detectFileKind(officeZip('word/'), 'Slaid.pptx')).toBeNull();
    expect(detectFileKind(bytesOf('PK\x03\x04....script.js'), 'nota.docx')).toBeNull();
    expect(detectFileKind(officeZip('word/'), 'archive.zip')).toBeNull();
  });

  it('refuses anything else, including web pages and programs named as documents', () => {
    expect(detectFileKind(bytesOf('<html><script>alert(1)</script>'), 'nota.pdf')).toBeNull();
    expect(detectFileKind(bytesOf('MZ\x90\x00'), 'gambar.jpg')).toBeNull();
    expect(detectFileKind(bytesOf('<svg onload="alert(1)"/>'), 'gambar.svg')).toBeNull();
    expect(detectFileKind(new Uint8Array(), 'kosong.pdf')).toBeNull();
  });
});

describe('cleanFileName', () => {
  it('keeps a readable name and gives it the extension of what the file really is', () => {
    expect(cleanFileName('Lembaran Kerja Bab 3.pdf', 'pdf')).toBe('Lembaran Kerja Bab 3.pdf');
    expect(cleanFileName('IMG_2041.HEIC', 'jpeg')).toBe('IMG_2041.jpg');
    expect(cleanFileName('nota', 'docx')).toBe('nota.docx');
  });

  it('drops folders, control characters and quotes', () => {
    expect(cleanFileName('C:\\Users\\guru\\..\\secret".pdf', 'pdf')).toBe('secret.pdf');
    expect(cleanFileName('../../etc/passwd', 'pdf')).toBe('passwd.pdf');
    expect(cleanFileName('a\u0000b\u202ecod.exe', 'pdf')).toBe('abcod.pdf');
    expect(cleanFileName('.pdf', 'pdf')).toBe('fail.pdf');
  });

  it('keeps names to 100 characters', () => {
    expect(cleanFileName(`${'a'.repeat(300)}.pdf`, 'pdf')).toHaveLength(100);
  });
});

describe('contentDisposition', () => {
  it('shows pictures in place and downloads everything else, with a safe fallback name', () => {
    expect(contentDisposition('Gambar papan.jpg', CONTENT_TYPES.jpeg))
      .toBe('inline; filename="Gambar papan.jpg"; filename*=UTF-8\'\'Gambar%20papan.jpg');
    expect(contentDisposition('Nota Sains — Bab 2.pdf', CONTENT_TYPES.pdf))
      .toBe('attachment; filename="Nota Sains _ Bab 2.pdf"; filename*=UTF-8\'\'Nota%20Sains%20%E2%80%94%20Bab%202.pdf');
  });
});
