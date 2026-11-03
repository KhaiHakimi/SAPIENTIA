import { FOE_DAMAGE, HERO_HP } from '../constants/battle.constants';
import type { AnswerOutcome, BattleRun } from '../interfaces/battle-run.interface';
import type { QuizChoice, QuizQuestion } from '../interfaces/quiz.interface';

/**
 * Quiz battle rules. A right answer takes FOE_DAMAGE off the monster; a wrong one costs the student the monster's hit and the
 * question comes back later. The monster falls at 0 HP; if the student reaches 0 first they must retry, and a retry never repeats
 * the previous question order. `random` is injectable so the rules can be tested.
 */

export type RandomSource = () => number;

export function shuffled<T>(list: readonly T[], random: RandomSource = Math.random): T[] {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const orderKey = (questions: readonly QuizQuestion[]) => questions.map((question) => question.id).join();

/** A fresh run; `previousOrder` is the last run's order at this stage, which a retry must not repeat. */
export function startRun(
  questions: readonly QuizQuestion[],
  previousOrder: string | undefined,
  random: RandomSource = Math.random,
): { run: BattleRun; order: string } {
  let order = shuffled(questions, random);
  for (let tries = 1; questions.length > 1 && orderKey(order) === previousOrder && tries < 10; tries += 1) {
    order = shuffled(questions, random);
  }
  const foeMax = questions.length * FOE_DAMAGE;
  return { run: { queue: order, foeHp: foeMax, foeMax, heroHp: HERO_HP, right: 0, wrong: 0 }, order: orderKey(order) };
}

/** The answers in a new order every time the question is asked. */
export const shuffleChoices = (question: QuizQuestion, random: RandomSource = Math.random): QuizChoice[] =>
  shuffled(question.options.map((option, index) => ({ option, correct: index === question.answer })), random);

export function nextQuestion(run: BattleRun): { question: QuizQuestion; run: BattleRun } {
  const [question, ...rest] = run.queue;
  return { question, run: { ...run, queue: rest } };
}

export function answerQuestion(
  run: BattleRun,
  question: QuizQuestion,
  correct: boolean,
  monsterHit: number,
): { run: BattleRun; outcome: AnswerOutcome } {
  const next: BattleRun = correct
    ? { ...run, foeHp: run.foeHp - FOE_DAMAGE, right: run.right + 1 }
    : {
        ...run,
        heroHp: run.heroHp - monsterHit,
        wrong: run.wrong + 1,
        queue: [...run.queue, question], // it comes back until it is answered correctly
      };
  const outcome: AnswerOutcome = next.foeHp <= 0 ? 'win' : next.heroHp <= 0 ? 'lose' : 'next';
  return { run: next, outcome };
}
