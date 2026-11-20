import { describe, expect, it } from 'vitest';
import { QUIZ_BANK, QUIZ_CHAPTERS } from '../data/quiz-bank';
import type { BattleStats } from './battle-stats.store';
import { QUIZ_LEVELS, chaptersFor, isUnlocked, levelsBeaten, nextStage, questionsFor, stageKey } from './quiz-stage.service';

const [maths1, maths2] = chaptersFor('math');
const won = { attempts: 1, wins: 1 };
const lost = { attempts: 2, wins: 0 };

describe('the question bank', () => {
  it('has questions at every level of every chapter', () => {
    for (const chapter of QUIZ_CHAPTERS) {
      for (const level of QUIZ_LEVELS) expect(questionsFor({ chapter, level }).length, `${chapter.id} level ${level}`).toBeGreaterThan(0);
    }
  });

  it('has unique ids, known chapters and a right answer among the options', () => {
    const chapterIds = new Set(QUIZ_CHAPTERS.map((chapter) => chapter.id));
    expect(new Set(QUIZ_BANK.map((question) => question.id)).size).toBe(QUIZ_BANK.length);
    for (const question of QUIZ_BANK) {
      expect(chapterIds.has(question.chapter), question.id).toBe(true);
      expect(question.options, question.id).toHaveLength(4);
      expect(question.answer >= 0 && question.answer < question.options.length, question.id).toBe(true);
    }
  });
});

describe('unlocking levels', () => {
  it('opens Easy at once and each later level after the one before is beaten', () => {
    const stats: BattleStats = { [stageKey({ chapter: maths1, level: 1 })]: won, [stageKey({ chapter: maths1, level: 2 })]: lost };
    expect(isUnlocked({}, { chapter: maths1, level: 1 })).toBe(true);
    expect(isUnlocked({}, { chapter: maths1, level: 2 })).toBe(false);
    expect(isUnlocked(stats, { chapter: maths1, level: 2 })).toBe(true);
    expect(isUnlocked(stats, { chapter: maths1, level: 3 })).toBe(false);
    expect(levelsBeaten(stats, maths1)).toBe(1);
  });

  it('keeps each chapter separate', () => {
    const stats: BattleStats = { [stageKey({ chapter: maths1, level: 1 })]: won };
    expect(isUnlocked(stats, { chapter: maths2, level: 2 })).toBe(false);
  });
});

describe('suggested next stage', () => {
  it('is the lowest unbeaten level of the first chapter not yet cleared', () => {
    expect(nextStage({}, 'math')).toEqual({ chapter: maths1, level: 1 });
    const cleared: BattleStats = Object.fromEntries(QUIZ_LEVELS.map((level) => [stageKey({ chapter: maths1, level }), won]));
    expect(nextStage(cleared, 'math')).toEqual({ chapter: maths2, level: 1 });
    expect(nextStage({ ...cleared, [stageKey({ chapter: maths2, level: 1 })]: won }, 'math')).toEqual({ chapter: maths2, level: 2 });
  });

  it('is nothing for a subject without quiz chapters', () => {
    expect(nextStage({}, 'pe')).toBeNull();
  });
});
