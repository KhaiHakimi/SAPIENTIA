import type { QuizQuestion } from './quiz.interface';

/** One run through a monster's questions. A wrong answer sends the question to the back of the queue. */
export interface BattleRun {
  queue: readonly QuizQuestion[];
  foeHp: number;
  foeMax: number;
  heroHp: number;
  right: number;
  wrong: number;
}

export type AnswerOutcome = 'next' | 'win' | 'lose';

/** Attempts and wins at one level of one chapter, kept in this browser. */
export interface BattleRecord {
  attempts: number;
  wins: number;
}
