import type { ProgressBaseline, Student, SubjectMastery } from '../interfaces/student.interface';

/** Sample data only. The student is fictional; the real profile comes from the API. */
export const SAMPLE_STUDENT: Student = { name: 'Aisyah', className: '4 Amanah' };

/** Level 3 at 130/150 XP, so one quest tips the student into level 4 for the demo. */
export const SAMPLE_BASELINE: ProgressBaseline = { xp: 430, coins: 120, streak: 3, classHandedIn: 18, classTotal: 25 };

export const SAMPLE_MASTERY: readonly SubjectMastery[] = [
  { subject: 'math', percent: 72 },
  { subject: 'sci', percent: 58 },
  { subject: 'bm', percent: 85 },
  { subject: 'bi', percent: 64 },
];
