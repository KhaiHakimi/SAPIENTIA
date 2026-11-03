import type { LocalizedText } from '@/shared/interfaces/localized-text.interface';

/** What a monster says in battle, so each fight feels like facing a villain rather than a quiz. One line is picked at random. */
export interface VillainLines {
  /** As it enters the arena. */
  entrance: LocalizedText;
  /** After the student answers wrongly and it strikes. */
  taunts: readonly LocalizedText[];
  /** After a right answer hits it. */
  pain: readonly LocalizedText[];
  /** As it falls. */
  defeat: LocalizedText;
  /** Over the fallen pahlawan; always ends by sending the student back to study. */
  victory: LocalizedText;
}
