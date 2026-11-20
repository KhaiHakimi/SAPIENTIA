import { describe, expect, it } from 'vitest';
import type { ReliefSuggestion } from '../interfaces/relief.interface';
import { busyTeacherIds, rankReliefCandidates, type BusyPeriod } from './relief-ranking.service';

const candidate = (name: string, reliefThisMonth: number, committedMinutesThisWeek: number): ReliefSuggestion => ({
  teacher: { id: `id-${name}`, name }, reliefThisMonth, committedMinutesThisWeek,
});
const names = (ranked: ReliefSuggestion[]) => ranked.map((item) => item.teacher.name);

describe('busyTeacherIds', () => {
  const periods: BusyPeriod[] = [
    { teacherId: 'before', start: '07:30', end: '08:00' },
    { teacherId: 'into', start: '07:30', end: '08:10' },
    { teacherId: 'inside', start: '08:20', end: '08:40' },
    { teacherId: 'around', start: '07:00', end: '10:00' },
    { teacherId: 'out-of', start: '09:00', end: '09:40' },
    { teacherId: 'after', start: '09:10', end: '10:20' },
  ];

  it('finds everyone whose period overlaps, and nobody whose period only touches the ends', () => {
    expect([...busyTeacherIds(periods, '08:00', '09:10')].sort()).toEqual(['around', 'inside', 'into', 'out-of']);
  });

  it('is empty when nothing overlaps', () => {
    expect(busyTeacherIds(periods, '12:00', '13:00').size).toBe(0);
  });
});

describe('rankReliefCandidates', () => {
  it('puts the fewest relief classes this month first, whatever the workload', () => {
    expect(names(rankReliefCandidates([candidate('Aminah', 2, 0), candidate('Ravi', 0, 600), candidate('Mei Ling', 1, 30)])))
      .toEqual(['Ravi', 'Mei Ling', 'Aminah']);
  });

  it('breaks a tie on relief classes with the least committed work this week', () => {
    expect(names(rankReliefCandidates([candidate('Aminah', 1, 240), candidate('Ravi', 1, 90), candidate('Mei Ling', 1, 120)])))
      .toEqual(['Ravi', 'Mei Ling', 'Aminah']);
  });

  it('breaks a full tie by name, so the same question always gets the same answer', () => {
    const tied = [candidate('Ravi', 0, 0), candidate('Aminah', 0, 0), candidate('Mei Ling', 0, 0)];
    expect(names(rankReliefCandidates(tied))).toEqual(['Aminah', 'Mei Ling', 'Ravi']);
    expect(names(rankReliefCandidates([...tied].reverse()))).toEqual(['Aminah', 'Mei Ling', 'Ravi']);
  });

  it('returns the top three only, and does not reorder the list it was given', () => {
    const many = [candidate('E', 4, 0), candidate('D', 3, 0), candidate('C', 2, 0), candidate('B', 1, 0), candidate('A', 0, 0)];
    expect(names(rankReliefCandidates(many))).toEqual(['A', 'B', 'C']);
    expect(names(many)).toEqual(['E', 'D', 'C', 'B', 'A']);
    expect(rankReliefCandidates([])).toEqual([]);
  });
});
