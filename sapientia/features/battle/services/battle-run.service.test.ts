import { describe, expect, it } from 'vitest';
import { FOE_DAMAGE, HERO_HP } from '../constants/battle.constants';
import { answerQuestion, nextQuestion, questionsFor, shuffleChoices, shuffled, startRun } from './battle-run.service';

/** A repeatable "random" sequence, so shuffles can be tested. */
function seeded(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

const maths = questionsFor('math');

describe('battle runs', () => {
  it('gives the monster 10 HP per question and the student 100 HP', () => {
    const { run } = startRun(maths, undefined);
    expect(run.foeMax).toBe(maths.length * FOE_DAMAGE);
    expect(run.foeHp).toBe(run.foeMax);
    expect(run.heroHp).toBe(HERO_HP);
    expect(run.queue).toHaveLength(maths.length);
  });

  it('never repeats the previous order on a retry', () => {
    const first = startRun(maths, undefined, seeded([0.1, 0.9, 0.5]));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(startRun(maths, first.order).order).not.toBe(first.order);
    }
  });

  it('shuffles without losing or duplicating anything', () => {
    const list = [1, 2, 3, 4, 5];
    expect([...shuffled(list)].sort()).toEqual(list);
    const choices = shuffleChoices(maths[0]);
    expect(choices.filter((choice) => choice.correct)).toHaveLength(1);
    expect(choices).toHaveLength(maths[0].options.length);
  });

  it('a right answer hurts the monster; the last one wins', () => {
    let { run } = startRun(maths, undefined);
    let outcome = 'next';
    for (let i = 0; i < maths.length; i += 1) {
      const asked = nextQuestion(run);
      ({ run, outcome } = answerQuestion(asked.run, asked.question, true, 20));
    }
    expect(run.foeHp).toBe(0);
    expect(run.right).toBe(maths.length);
    expect(outcome).toBe('win');
  });

  it('a wrong answer hurts the student, sends the question back and counts the topic', () => {
    const { run } = startRun(maths, undefined);
    const asked = nextQuestion(run);
    const { run: after, outcome } = answerQuestion(asked.run, asked.question, false, 34);
    expect(after.heroHp).toBe(HERO_HP - 34);
    expect(after.queue.at(-1)).toBe(asked.question);
    expect(after.queue).toHaveLength(maths.length);
    expect(after.missed.math).toBe(1);
    expect(outcome).toBe('next');
  });

  it('the student loses at 0 HP', () => {
    let { run } = startRun(maths, undefined);
    let outcome = 'next';
    while (outcome === 'next') {
      const asked = nextQuestion(run);
      ({ run, outcome } = answerQuestion(asked.run, asked.question, false, 34));
    }
    expect(outcome).toBe('lose');
    expect(run.wrong).toBe(3);
  });
});
