import type { CelebrationLog } from '../interfaces/celebration.interface';
import type { Relic } from '../interfaces/relic.interface';

/**
 * Remembers the highest level, the relics and the quests already celebrated on this visit. Unticking a quest takes its XP, coins
 * and relic back, so ticking it again would otherwise replay the level-up dialog, relic toast and coin burst.
 */
export function createCelebrationLog(): CelebrationLog {
  let highestLevel = 0;
  const relicIds = new Set<string>();
  const questIds = new Set<string>();
  return {
    levelUp(levelBefore, levelAfter) {
      if (levelAfter <= Math.max(levelBefore, highestLevel)) return null;
      highestLevel = levelAfter;
      return levelAfter;
    },
    freshRelics(earned: readonly Relic[]) {
      const fresh = earned.filter((relic) => !relicIds.has(relic.id));
      fresh.forEach((relic) => relicIds.add(relic.id));
      return fresh;
    },
    firstTick(questId) {
      if (questIds.has(questId)) return false;
      questIds.add(questId);
      return true;
    },
  };
}
