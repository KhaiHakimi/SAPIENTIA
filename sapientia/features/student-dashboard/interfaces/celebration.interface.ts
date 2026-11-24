import type { Relic } from './relic.interface';

/** What has already been celebrated on this visit. Each method records what it lets through. */
export interface CelebrationLog {
  /** The level to celebrate when progress moves from `levelBefore` to `levelAfter`; null when that level was already shown. */
  levelUp: (levelBefore: number, levelAfter: number) => number | null;
  /** The relics among `earned` that have not been celebrated yet. */
  freshRelics: (earned: readonly Relic[]) => Relic[];
  /** True only the first time this quest is ticked. */
  firstTick: (questId: string) => boolean;
}
