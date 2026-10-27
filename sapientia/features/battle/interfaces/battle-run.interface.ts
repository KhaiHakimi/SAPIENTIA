import type { SchoolSubjectKey } from '@/shared/interfaces/school-subject.interface';
import type { QuizQuestion } from './quiz.interface';

/** One run through a monster's questions. A wrong answer sends the question to the back of the queue. */
export interface BattleRun {
  queue: readonly QuizQuestion[];
  foeHp: number;
  foeMax: number;
  heroHp: number;
  right: number;
  wrong: number;
  /** Wrong answers per subject, listed as topics to revisit at the end. */
  missed: Readonly<Partial<Record<SchoolSubjectKey, number>>>;
}

export type AnswerOutcome = 'next' | 'win' | 'lose';

/** Attempts and wins against one monster, kept in this browser. */
export interface BattleRecord {
  attempts: number;
  wins: number;
}
