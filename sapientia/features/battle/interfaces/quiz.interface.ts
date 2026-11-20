import type { MonsterLevel } from '@/features/characters';
import type { LocalizedText, TextOrLocalized } from '@/shared/interfaces/localized-text.interface';
import type { SchoolSubjectKey } from '@/shared/interfaces/school-subject.interface';

/** One chapter of a subject's syllabus. Every chapter has a question set for each of the four monster levels. */
export interface QuizChapter {
  /** `<subject>-<number>`, for example `math-2`. */
  id: string;
  subject: SchoolSubjectKey;
  number: number;
  title: LocalizedText;
}

/**
 * One quiz question. When the subject being tested is a language, the words being tested are not translated (a gloss would give
 * the answer away); those options are plain strings.
 */
export interface QuizQuestion {
  id: string;
  /** QuizChapter.id */
  chapter: string;
  /** Which monster asks it: 1 Easy (recall), 2 Medium (use), 3 Hard (two steps or a trap), 4 Very Hard (problems in context). */
  level: MonsterLevel;
  question: LocalizedText;
  options: readonly TextOrLocalized[];
  /** Index of the right option in `options`. */
  answer: number;
  /** Shown after the answer, right or wrong. */
  why: LocalizedText;
}

/** One subject's sample chapters and questions. */
export interface QuizSubjectBank {
  chapters: readonly QuizChapter[];
  questions: readonly QuizQuestion[];
}

/** What a fight is against: one level of one chapter. The monster is the one for that level. */
export interface QuizStage {
  chapter: QuizChapter;
  level: MonsterLevel;
}

/** An option as shown in one fight: the answers are reshuffled every time. */
export interface QuizChoice {
  option: TextOrLocalized;
  correct: boolean;
}
