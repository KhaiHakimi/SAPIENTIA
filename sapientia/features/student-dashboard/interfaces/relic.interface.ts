import type { LocalizedText } from '@/shared/interfaces/localized-text.interface';
import type { PixelSpriteName } from '@/shared/sprites/pixel-sprites';

/**
 * How a relic is earned. "earned" and "locked" are fixed sample states; the other two follow the quest list, so undoing a
 * quest takes the relic back.
 */
export type RelicUnlock = 'earned' | 'locked' | 'guardian-defeated' | 'handed-in-early';

export interface Relic {
  id: string;
  sprite: PixelSpriteName;
  name: LocalizedText;
  hint: LocalizedText;
  unlock: RelicUnlock;
}
