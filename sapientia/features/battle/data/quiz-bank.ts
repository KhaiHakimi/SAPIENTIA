import type { QuizChapter, QuizQuestion } from '../interfaces/quiz.interface';
import { ENGLISH_QUIZ } from './quiz/english.quiz';
import { MALAY_QUIZ } from './quiz/malay.quiz';
import { MATH_QUIZ } from './quiz/math.quiz';
import { SCIENCE_QUIZ } from './quiz/science.quiz';

/**
 * Sample Year 4 question bank: two chapters per subject, three questions per chapter per level. The chapter titles are sample
 * topics, not checked against the syllabus, and no teacher has reviewed the questions; the real bank comes from the API.
 */
const SUBJECTS = [MALAY_QUIZ, ENGLISH_QUIZ, MATH_QUIZ, SCIENCE_QUIZ];

/** In lair order: Bahasa Melayu, English, Mathematics, Science, then chapter number. */
export const QUIZ_CHAPTERS: readonly QuizChapter[] = SUBJECTS.flatMap((subject) => subject.chapters);

export const QUIZ_BANK: readonly QuizQuestion[] = SUBJECTS.flatMap((subject) => subject.questions);
