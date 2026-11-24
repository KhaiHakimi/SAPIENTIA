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

  it('flags a line with more than one comma or tab instead of folding the extra value into the name', () => {
    expect(parseClassList('Ali bin Abu, 010203-14-5678, A123\nSiti\t010203-14-5678\tA124\nTan, Mei Ling\tA125\nDaniel Lee, A126')).toEqual([
      { line: 1, name: 'Ali bin Abu, 010203-14-5678, A123', schoolNumber: null, problem: 'too_many_values' },
      { line: 2, name: 'Siti\t010203-14-5678\tA124', schoolNumber: null, problem: 'too_many_values' },
      { line: 3, name: 'Tan, Mei Ling\tA125', schoolNumber: null, problem: 'too_many_values' },
      { line: 4, name: 'Daniel Lee', schoolNumber: 'A126' },
    ]);
  });

  it('returns nothing for an empty paste', () => {
    expect(parseClassList('  \n\t\n')).toEqual([]);
  });
});
