import type { LocalizedText, TextOrLocalized } from '@/shared/interfaces/localized-text.interface';
import type { SchoolSubjectKey } from '@/shared/interfaces/school-subject.interface';

/**
 * One quiz question. When the subject being tested is a language, the words being tested are not translated (a gloss would give
 * the answer away); those options are plain strings.
 */
export interface QuizQuestion {
  id: string;
  subject: SchoolSubjectKey;
  question: LocalizedText;
  options: readonly TextOrLocalized[];
  /** Index of the right option in `options`. */
  answer: number;
  /** Shown after the answer, right or wrong. */
  why: LocalizedText;
}

/** An option as shown in one fight: the answers are reshuffled every time. */
export interface QuizChoice {
  option: TextOrLocalized;
  correct: boolean;
}
