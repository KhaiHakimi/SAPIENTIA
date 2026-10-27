import { describe, expect, it } from 'vitest';
import { cleanPahlawanName } from './pahlawan-name.service';

describe('pahlawan name', () => {
  it('keeps names short and plain', () => {
    expect(cleanPahlawanName('  Hang Jebat  ')).toBe('Hang Jebat');
    expect(cleanPahlawanName('Laksamana Hang Tuah')).toBe('Laksamana Ha');
    expect(cleanPahlawanName('<b>Tuah</b>')).toBe('bTuah/b');
    expect(cleanPahlawanName('Tu\u0000ah\n')).toBe('Tuah');
    expect(cleanPahlawanName(undefined)).toBe('');
  });
});
