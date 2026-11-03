import type { MonsterLevel } from '@/features/characters';
import type { SchoolSubjectKey } from '@/shared/interfaces/school-subject.interface';
import { QUIZ_BANK, QUIZ_CHAPTERS } from '../data/quiz-bank';
import type { QuizChapter, QuizQuestion, QuizStage } from '../interfaces/quiz.interface';
import { recordFor, type BattleStats } from './battle-stats.store';

/**
 * Chapters and levels. Within a chapter the levels open in order: Medium once Easy has been beaten, and so on, so the student
 * builds up from recall to problems in context before facing the hardest monster.
 */

export const QUIZ_LEVELS: readonly MonsterLevel[] = [1, 2, 3, 4];

/** The subjects that have quiz chapters, in lair order. */
export const QUIZ_SUBJECTS: readonly SchoolSubjectKey[] = [...new Set(QUIZ_CHAPTERS.map((chapter) => chapter.subject))];

export const chaptersFor = (subject: SchoolSubjectKey): QuizChapter[] => QUIZ_CHAPTERS.filter((chapter) => chapter.subject === subject);

export const questionsFor = (stage: QuizStage): QuizQuestion[] =>
  QUIZ_BANK.filter((question) => question.chapter === stage.chapter.id && question.level === stage.level);

/** Battle records are kept per stage under this key. */
export const stageKey = (stage: QuizStage): string => `${stage.chapter.id}:${stage.level}`;

export const isBeaten = (stats: BattleStats, stage: QuizStage): boolean => recordFor(stats, stageKey(stage)).wins > 0;

export const isUnlocked = (stats: BattleStats, stage: QuizStage): boolean =>
  stage.level === 1 || isBeaten(stats, { chapter: stage.chapter, level: (stage.level - 1) as MonsterLevel });

export const levelsBeaten = (stats: BattleStats, chapter: QuizChapter): number =>
  QUIZ_LEVELS.filter((level) => isBeaten(stats, { chapter, level })).length;

/**
 * What to practise next in a subject: the lowest unbeaten level of the first chapter not yet cleared. Once every chapter is
 * cleared, the last chapter's Very Hard level, for revision. Null for a subject with no quiz chapters.
 */
export function nextStage(stats: BattleStats, subject: SchoolSubjectKey): QuizStage | null {
  const chapters = chaptersFor(subject);
  for (const chapter of chapters) {
    const level = QUIZ_LEVELS.find((candidate) => !isBeaten(stats, { chapter, level: candidate }));
    if (level) return { chapter, level };
  }
  const last = chapters.at(-1);
  return last ? { chapter: last, level: 4 } : null;
}
