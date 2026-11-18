import { describe, expect, it } from 'vitest';
import { SAMPLE_RELICS } from '../data/sample-relics';
import type { Quest } from '../interfaces/quest.interface';
import {
  currentStreak,
  guardianHpPercent,
  isGuardianDefeated,
  isQuestDone,
  isRelicEarned,
  isTodayLit,
  levelOf,
  newlyDone,
  rankIndex,
  totalCoins,
  totalXp,
  xpIntoLevel,
  type TotalsInput,
} from './progress.service';

const TODAY = '2026-11-19'; // a Thursday
const quest = (id: string, dueOn: string, xp: number, handedIn = false): Quest => ({
  id, subjectName: 'Matematik', title: id, teacherName: 'Cikgu', details: null, dueOn, xp, coins: xp / 3, handedIn,
  comments: [],
});
// Due today, tomorrow, Friday, and one the teacher has already recorded.
const QUESTS: readonly Quest[] = [quest('math', TODAY, 30), quest('sci', '2026-11-20', 30), quest('bm', '2026-11-20', 60), quest('bi', '2026-11-18', 30, true)];
const allTicked = { math: true, sci: true, bm: true };
const base: TotalsInput = {
  baseXp: 430, baseCoins: 120, quests: QUESTS, done: {},
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

describe('the teacher\'s record and the pupil\'s tick', () => {
  it('treats a recorded hand-in as done whatever the pupil ticks, and never pays for it', () => {
    const recorded = QUESTS[3];
    expect(isQuestDone(recorded, {})).toBe(true);
    expect(isQuestDone(recorded, { bi: false })).toBe(true);
    expect(newlyDone(QUESTS, { bi: true })).toEqual([]);
  });

  it('counts the pupil\'s own ticks as done until undone', () => {
    expect(isQuestDone(QUESTS[0], { math: true })).toBe(true);
    expect(isQuestDone(QUESTS[0], { math: false })).toBe(false);
  });
});

describe('totals', () => {
  it('pays only for quests the pupil ticks on this visit', () => {
    expect(totalXp(base)).toBe(430);
    expect(totalXp({ ...base, done: { math: true } })).toBe(460);
  });

  it('adds the guardian bonus once every room is cleared, and takes it back on undo', () => {
    expect(totalXp({ ...base, done: allTicked })).toBe(430 + 30 + 30 + 60 + 25);
    expect(totalXp({ ...base, done: { ...allTicked, sci: false } })).toBe(430 + 30 + 60);
  });

  it('pays no guardian bonus when the teacher had already recorded everything', () => {
    const recordedOnly = [quest('a', TODAY, 30, true)];
    expect(isGuardianDefeated(recordedOnly, {})).toBe(true);
    expect(totalXp({ ...base, quests: recordedOnly })).toBe(430);
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
    expect(guardianHpPercent(QUESTS, {})).toBe(Math.round((120 / 150) * 100));
    expect(guardianHpPercent(QUESTS, allTicked)).toBe(0);
    expect(isGuardianDefeated(QUESTS, allTicked)).toBe(true);
  });

  it('has no guardian to defeat when there is no homework', () => {
    expect(isGuardianDefeated([], {})).toBe(false);
    expect(guardianHpPercent([], {})).toBe(0);
  });

  it("lights today's torch once the pupil ticks a quest, not for a hand-in recorded before", () => {
    expect(isTodayLit(QUESTS, {})).toBe(false);
    expect(isTodayLit(QUESTS, { math: true })).toBe(true);
    expect(currentStreak(3, true)).toBe(4);
  });
});

describe('relics', () => {
  it('earns "early" only for a quest ticked before its due day', () => {
    expect(isRelicEarned(relic('early'), QUESTS, { math: true }, TODAY)).toBe(false); // due today
    expect(isRelicEarned(relic('early'), QUESTS, { sci: true }, TODAY)).toBe(true); // due tomorrow
  });

  it('earns "perfect" with the guardian and loses it on undo', () => {
    expect(isRelicEarned(relic('perfect'), QUESTS, allTicked, TODAY)).toBe(true);
    expect(isRelicEarned(relic('perfect'), QUESTS, { ...allTicked, bm: false }, TODAY)).toBe(false);
  });
});
