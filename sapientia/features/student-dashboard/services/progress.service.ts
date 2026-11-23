import { GUARDIAN_BONUS_XP, XP_PER_LEVEL } from '../constants/progress.constants';
import type { Quest, QuestDoneMap } from '../interfaces/quest.interface';
import type { Relic } from '../interfaces/relic.interface';
import { daysBetween } from '@/shared/services/school-clock.service';

/**
 * Progress rules. Every total is worked out from the quest list and the battle wins, never stored, so Undo can never drift out
 * of step with the XP, coins, relics or streak.
 */

export const levelOf = (xp: number): number => Math.floor(xp / XP_PER_LEVEL) + 1;

export const xpIntoLevel = (xp: number): number => xp % XP_PER_LEVEL;

/** The rank title for a level; levels past the last rank keep the last title. */
export const rankIndex = (level: number, rankCount: number): number => Math.min(level - 1, rankCount - 1);

/** Cleared once the teacher records the hand-in, or while the pupil has it ticked. */
const isDone = (quest: Quest, done: QuestDoneMap): boolean => quest.handedIn || done[quest.id] === true;

/** Quests the pupil ticked on this visit and the teacher has not recorded yet: the ones that pay out. */
export const newlyDone = (quests: readonly Quest[], done: QuestDoneMap): Quest[] =>
  quests.filter((quest) => !quest.handedIn && done[quest.id] === true);

export const doneCount = (quests: readonly Quest[], done: QuestDoneMap): number => quests.filter((quest) => isDone(quest, done)).length;

export const isQuestDone = isDone;

/** The weekly guardian falls once every room is cleared; with no rooms there is nothing to defeat. */
export const isGuardianDefeated = (quests: readonly Quest[], done: QuestDoneMap): boolean =>
  quests.length > 0 && quests.every((quest) => isDone(quest, done));

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
  const ticked = newlyDone(input.quests, input.done);
  const questXp = ticked.reduce((sum, quest) => sum + quest.xp, 0);
  // The bonus pays when this visit's ticks bring the guardian down, not on every visit after the teacher has recorded them all.
  const guardianXp = ticked.length > 0 && isGuardianDefeated(input.quests, input.done) ? GUARDIAN_BONUS_XP : 0;
  return input.baseXp + questXp + guardianXp + input.battleWins * input.battleBonusXp;
}

/**
 * Every purchase costs its price. Coins earned on an earlier visit are not kept yet (quest progress resets on reload) while
 * purchases are, so the balance stops at zero instead of going negative.
 */
export function totalCoins(input: TotalsInput): number {
  const questCoins = newlyDone(input.quests, input.done).reduce((sum, quest) => sum + quest.coins, 0);
  const earned = questCoins + input.battleWins * input.battleBonusCoins;
  return Math.max(0, input.baseCoins + earned - input.spentCoins);
}

/** Today's torch lights once the pupil ticks a quest today; a hand-in recorded earlier does not light it. */
export const isTodayLit = (quests: readonly Quest[], done: QuestDoneMap): boolean => newlyDone(quests, done).length > 0;

export const currentStreak = (baseStreak: number, todayLit: boolean): number => baseStreak + (todayLit ? 1 : 0);

export function isRelicEarned(relic: Relic, quests: readonly Quest[], done: QuestDoneMap, today: string): boolean {
  switch (relic.unlock) {
    case 'earned':
      return true;
    case 'locked':
      return false;
    case 'guardian-defeated':
      return isGuardianDefeated(quests, done);
    case 'handed-in-early':
      return newlyDone(quests, done).some((quest) => daysBetween(today, quest.dueOn) >= 1);
  }
}
