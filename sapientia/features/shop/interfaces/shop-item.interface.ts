import type { LocalizedText } from '@/shared/interfaces/localized-text.interface';

/** Skins recolour the whole board, frames restyle the card corners, avatars replace the profile picture. All cosmetic. */
export type ShopKind = 'skin' | 'frame' | 'avatar';

export type SkinValue = 'stone' | 'royal' | 'forest' | 'ember' | 'sakura';
export type FrameValue = 'bracket' | 'crown' | 'iron' | 'banner';
export type AvatarValue = 'squire' | 'knight' | 'mage' | 'owl';

interface ShopItemBase {
  id: string;
  price: number;
  name: LocalizedText;
}

export type ShopItem =
  | (ShopItemBase & { kind: 'skin'; value: SkinValue })
  | (ShopItemBase & { kind: 'frame'; value: FrameValue })
  | (ShopItemBase & { kind: 'avatar'; value: AvatarValue });

export interface EquippedLook {
  skin: SkinValue;
  frame: FrameValue;
  avatar: AvatarValue;
}

/** What is saved: paid items owned (free ones are always owned) and what is worn. */
export interface ShopState {
  owned: readonly string[];
  equipped: EquippedLook;
}
