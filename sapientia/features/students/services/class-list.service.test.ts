import { describe, expect, it } from 'vitest';
import { parseClassList } from './class-list.service';

describe('parseClassList', () => {
  it('reads names alone, names with a comma and a number, and a column pasted from Excel', () => {
    expect(parseClassList('Aisyah binti Rahman\nDaniel Lee, M2027/02\r\nKavitha a/p Raman\tM2027/03')).toEqual([
      { line: 1, name: 'Aisyah binti Rahman', schoolNumber: null },
      { line: 2, name: 'Daniel Lee', schoolNumber: 'M2027/02' },
      { line: 3, name: 'Kavitha a/p Raman', schoolNumber: 'M2027/03' },
    ]);
  });

  it('skips blank lines but keeps the real line numbers', () => {
    expect(parseClassList('\n  Ali  \n\n Mei Ling ,  \n')).toEqual([
      { line: 2, name: 'Ali', schoolNumber: null },
      { line: 4, name: 'Mei Ling', schoolNumber: null },
    ]);
  });

  it('uses the last comma, so the number is always the last value', () => {
    expect(parseClassList('Tan, Mei Ling, 1234')).toEqual([{ line: 1, name: 'Tan, Mei Ling', schoolNumber: '1234' }]);
  });

  it('returns nothing for an empty paste', () => {
    expect(parseClassList('  \n\t\n')).toEqual([]);
  });
});
