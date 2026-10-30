import { describe, expect, it } from 'vitest';
import { SAMPLE_QUESTS } from '../data/sample-quests';
import { SAMPLE_RELICS } from '../data/sample-relics';
import {
  currentStreak,
  guardianHpPercent,
  isGuardianDefeated,
  isRelicEarned,
  isTodayLit,
  levelOf,
  rankIndex,
  totalCoins,
  totalXp,
  xpIntoLevel,
  type TotalsInput,
} from './progress.service';

const allDone = Object.fromEntries(SAMPLE_QUESTS.map((quest) => [quest.id, true]));
const base: TotalsInput = {
  baseXp: 430, baseCoins: 120, quests: SAMPLE_QUESTS, done: {},
  battleWins: 0, battleBonusXp: 20, battleBonusCoins: 10, spentCoins: 0,
};
const relic = (id: string) => SAMPLE_RELICS.find((candidate) => candidate.id === id)!;

describe('levels', () => {
  it('starts at level 1 and moves up every 150 XP', () => {
    expect(levelOf(0)).toBe(1);
    expect(levelOf(149)).toBe(1);
    expect(levelOf(150)).toBe(2);
    expect(levelOf(430)).toBe(3);
    expect(xpIntoLevel(430)).toBe(130);
  });

  it('keeps the last rank title past the last rank', () => {
    expect(rankIndex(1, 6)).toBe(0);
    expect(rankIndex(9, 6)).toBe(5);
  });
});

describe('totals', () => {
  it('pays only for quests finished during this visit', () => {
    // The reading log was done at the start, so it earns nothing again.
    expect(totalXp(base)).toBe(430);
    expect(totalXp({ ...base, done: { math: true } })).toBe(460);
  });

  it('adds the guardian bonus once every room is cleared, and takes it back on undo', () => {
    expect(totalXp({ ...base, done: allDone })).toBe(430 + 30 + 40 + 50 + 25);
    expect(totalXp({ ...base, done: { ...allDone, sci: false } })).toBe(430 + 30 + 50);
  });

  it('counts battle wins and takes shop spending off the coins', () => {
    expect(totalXp({ ...base, battleWins: 2 })).toBe(470);
    expect(totalCoins({ ...base, battleWins: 1, spentCoins: 80 })).toBe(120 + 10 - 80);
  });

  it('never lets saved purchases push the demo balance below zero', () => {
    expect(totalCoins({ ...base, spentCoins: 300 })).toBe(0);
  });
});

describe('guardian and torch', () => {
  it('drains guardian HP by the share of quest XP done', () => {
    expect(guardianHpPercent(SAMPLE_QUESTS, {})).toBe(Math.round((120 / 140) * 100));
    expect(guardianHpPercent(SAMPLE_QUESTS, allDone)).toBe(0);
    expect(isGuardianDefeated(SAMPLE_QUESTS, allDone)).toBe(true);
  });

  it("lights today's torch once any quest is done", () => {
    expect(isTodayLit(SAMPLE_QUESTS, {})).toBe(true); // the reading log was already done
    expect(isTodayLit(SAMPLE_QUESTS, { bi: false })).toBe(false);
    expect(currentStreak(3, true)).toBe(4);
  });
});

describe('relics', () => {
  it('earns "early" only for a quest finished before its due day', () => {
    expect(isRelicEarned(relic('early'), SAMPLE_QUESTS, { math: true })).toBe(false); // due today
    expect(isRelicEarned(relic('early'), SAMPLE_QUESTS, { sci: true })).toBe(true); // due tomorrow
  });

  it('earns "perfect" with the guardian and loses it on undo', () => {
    expect(isRelicEarned(relic('perfect'), SAMPLE_QUESTS, allDone)).toBe(true);
    expect(isRelicEarned(relic('perfect'), SAMPLE_QUESTS, { ...allDone, bm: false })).toBe(false);
  });
});
