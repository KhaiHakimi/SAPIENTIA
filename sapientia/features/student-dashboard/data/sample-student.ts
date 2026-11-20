import type { ProgressBaseline, SubjectMastery } from '../interfaces/student.interface';

/**
 * Sample numbers only, the same for every pupil: XP, coins, the streak and subject mastery are not kept on the server yet.
 * Level 3 at 130/150 XP, so one quest tips the pupil into level 4.
 */
export const SAMPLE_BASELINE: ProgressBaseline = { xp: 430, coins: 120, streak: 3 };

export const SAMPLE_MASTERY: readonly SubjectMastery[] = [
  { subject: 'math', percent: 72 },
  { subject: 'sci', percent: 58 },
  { subject: 'bm', percent: 85 },
  { subject: 'bi', percent: 64 },
];
