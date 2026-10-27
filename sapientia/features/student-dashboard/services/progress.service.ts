import { GUARDIAN_BONUS_XP, XP_PER_LEVEL } from '../constants/progress.constants';
import type { Quest, QuestDoneMap } from '../interfaces/quest.interface';
import type { Relic } from '../interfaces/relic.interface';

/**
 * Progress rules. Every total is worked out from the quest list and the battle wins, never stored, so Undo can never drift out
 * of step with the XP, coins, relics or streak.
 */

export const levelOf = (xp: number): number => Math.floor(xp / XP_PER_LEVEL) + 1;

export const xpIntoLevel = (xp: number): number => xp % XP_PER_LEVEL;

/** The rank title for a level; levels past the last rank keep the last title. */
export const rankIndex = (level: number, rankCount: number): number => Math.min(level - 1, rankCount - 1);

const isDone = (quest: Quest, done: QuestDoneMap): boolean => done[quest.id] ?? quest.doneAtStart;

/** Quests finished during this visit (the ones that pay out). */
export const newlyDone = (quests: readonly Quest[], done: QuestDoneMap): Quest[] => quests.filter((quest) => isDone(quest, done) && !quest.doneAtStart);

export const doneCount = (quests: readonly Quest[], done: QuestDoneMap): number => quests.filter((quest) => isDone(quest, done)).length;

export const isQuestDone = isDone;

/** The weekly guardian falls once every room is cleared. */
export const isGuardianDefeated = (quests: readonly Quest[], done: QuestDoneMap): boolean => quests.every((quest) => isDone(quest, done));

/** Guardian HP is the share of quest XP still waiting. */
export function guardianHpPercent(quests: readonly Quest[], done: QuestDoneMap): number {
  const total = quests.reduce((sum, quest) => sum + quest.xp, 0);
  const remaining = quests.filter((quest) => !isDone(quest, done)).reduce((sum, quest) => sum + quest.xp, 0);
  return total === 0 ? 0 : Math.round((remaining / total) * 100);
}

export interface TotalsInput {
  baseXp: number;
  baseCoins: number;
  quests: readonly Quest[];
  done: QuestDoneMap;
  battleWins: number;
  battleBonusXp: number;
  battleBonusCoins: number;
  spentCoins: number;
}

export function totalXp(input: TotalsInput): number {
  const questXp = newlyDone(input.quests, input.done).reduce((sum, quest) => sum + quest.xp, 0);
  const guardianXp = isGuardianDefeated(input.quests, input.done) ? GUARDIAN_BONUS_XP : 0;
  return input.baseXp + questXp + guardianXp + input.battleWins * input.battleBonusXp;
}

/** Quest progress is demo data and resets on reload, so saved purchases never push the balance below zero. */
export function totalCoins(input: TotalsInput): number {
  const questCoins = newlyDone(input.quests, input.done).reduce((sum, quest) => sum + quest.coins, 0);
  const base = Math.max(input.baseCoins, input.spentCoins);
  return base + questCoins + input.battleWins * input.battleBonusCoins - input.spentCoins;
}

/** Today's torch lights once any quest is done. */
export const isTodayLit = (quests: readonly Quest[], done: QuestDoneMap): boolean => quests.some((quest) => isDone(quest, done));

export const currentStreak = (baseStreak: number, todayLit: boolean): number => baseStreak + (todayLit ? 1 : 0);

export function isRelicEarned(relic: Relic, quests: readonly Quest[], done: QuestDoneMap): boolean {
  switch (relic.unlock) {
    case 'earned':
      return true;
    case 'locked':
      return false;
    case 'guardian-defeated':
      return isGuardianDefeated(quests, done);
    case 'handed-in-early':
      return newlyDone(quests, done).some((quest) => quest.due !== 'today');
  }
}
