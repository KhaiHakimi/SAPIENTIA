import { describe, expect, it } from 'vitest';
import { redactPersonalData } from './redaction.service';

const STAFF = ['Aminah binti Yusof', 'Lim Mei Ling', 'Rajesh a/l Kumar'];

describe('redactPersonalData', () => {
  it('removes full names and their distinctive parts, whatever the case', () => {
    const result = redactPersonalData('Minta Cikgu AMINAH dan Mei Ling hantar markah PBD sebelum Jumaat', STAFF);
    expect(result.text).toBe('Minta Cikgu [nama] dan [nama] hantar markah PBD sebelum Jumaat');
    expect(result.removed).toBe(3);
  });

  it('keeps titles and "binti" that are not names on their own', () => {
    expect(redactPersonalData('Puan binti mesyuarat', STAFF).text).toBe('Puan binti mesyuarat');
  });

  it('does not remove a name part inside a longer word', () => {
    expect(redactPersonalData('Limpahan stor', STAFF).text).toBe('Limpahan stor');
  });

  it('removes a full name written across extra spaces as one person', () => {
    expect(redactPersonalData('Rajesh  a/l Kumar akan bantu', STAFF).text).toBe('[nama] akan bantu');
  });

  it('removes emails, MyKad-like numbers and phone numbers', () => {
    const result = redactPersonalData('Emel aminah@sekolah.test, IC 090101-10-1234 atau 090101101234, tel 012-345 6789 / +60 3 1234 5678', []);
    expect(result.text).not.toMatch(/aminah@|090101|345 6789|1234 5678/);
    expect(result.text).toContain('[emel]');
    expect(result.text).toContain('[nombor]');
  });

  it('leaves dates, years and counts alone', () => {
    const text = 'Hantar 30 salinan sebelum 2026-12-04, Tahun 4 dan 5';
    expect(redactPersonalData(text, STAFF)).toEqual({ text, removed: 0 });
  });

  it('treats regular-expression characters in names literally', () => {
    expect(redactPersonalData('Tanya (Ali) nanti', ['Ali (Cikgu)']).text).toBe('Tanya ([nama]) nanti');
  });
});
