import { describe, expect, it } from 'vitest';
import { normaliseTitle, SIMILARITY_THRESHOLD, titleSimilarity } from './task-similarity.service';

const alike = (a: string, b: string) => titleSimilarity(a, b) >= SIMILARITY_THRESHOLD;

describe('titleSimilarity', () => {
  it('treats the same title in another case, order or punctuation as the same', () => {
    expect(titleSimilarity('Hantar markah PBD', 'hantar markah pbd!')).toBe(1);
    expect(alike('Hantar markah PBD Tahun 4', 'Markah PBD Tahun 4 - hantar')).toBe(true);
  });

  it('catches small spelling differences and endings', () => {
    expect(alike('Laporan kokurikulum bulanan', 'Laporan kokurikulm bulanan')).toBe(true);
    expect(alike('Kemas kini laporan', 'Kemaskini laporannya')).toBe(true);
  });

  it('ignores words that say nothing about the task', () => {
    expect(alike('Sila hantar markah PBD', 'Mohon semua guru hantar markah PBD')).toBe(true);
  });

  it('keeps different tasks apart', () => {
    expect(alike('Hantar markah PBD', 'Mesyuarat panitia Sains')).toBe(false);
    expect(alike('Rancangan pengajaran harian', 'Rekod kehadiran murid')).toBe(false);
    expect(alike('Hantar markah PBD Tahun 4', 'Hantar borang kesihatan')).toBe(false);
  });

  it('is 0 when a title has only stop words or nothing at all', () => {
    expect(titleSimilarity('Sila dan untuk', 'Sila dan untuk')).toBe(0);
    expect(titleSimilarity('', 'Hantar')).toBe(0);
  });

  it('ignores accents', () => {
    expect(normaliseTitle('Café  Réunion')).toBe('cafe reunion');
  });
});
