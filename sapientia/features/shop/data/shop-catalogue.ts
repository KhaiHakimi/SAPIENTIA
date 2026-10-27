import type { ShopItem, ShopKind, ShopState } from '../interfaces/shop-item.interface';

export const SHOP_KINDS: readonly ShopKind[] = ['skin', 'frame', 'avatar'];

/** Prices in coins. The first item of each kind is free and worn by default. */
export const SHOP_CATALOGUE: readonly ShopItem[] = [
  { id: 'skin-stone', kind: 'skin', value: 'stone', price: 0, name: { ms: 'Kubu Batu', en: 'Stone Keep' } },
  { id: 'skin-royal', kind: 'skin', value: 'royal', price: 80, name: { ms: 'Dewan Diraja', en: 'Royal Hall' } },
  { id: 'skin-forest', kind: 'skin', value: 'forest', price: 80, name: { ms: 'Runtuhan Hutan', en: 'Forest Ruins' } },
  { id: 'skin-ember', kind: 'skin', value: 'ember', price: 100, name: { ms: 'Tempa Bara', en: 'Ember Forge' } },
  { id: 'skin-sakura', kind: 'skin', value: 'sakura', price: 90, name: { ms: 'Taman Sakura', en: 'Sakura Garden' } },
  { id: 'frame-bracket', kind: 'frame', value: 'bracket', price: 0, name: { ms: 'Kurungan Kesatria', en: "Knight's Brackets" } },
  { id: 'frame-crown', kind: 'frame', value: 'crown', price: 60, name: { ms: 'Emas Diraja', en: 'Royal Gold' } },
  { id: 'frame-iron', kind: 'frame', value: 'iron', price: 50, name: { ms: 'Besi Berpaku', en: 'Studded Iron' } },
  { id: 'frame-banner', kind: 'frame', value: 'banner', price: 70, name: { ms: 'Panji Merah', en: 'Crimson Banner' } },
  { id: 'avatar-squire', kind: 'avatar', value: 'squire', price: 0, name: { ms: 'Pengiring', en: 'Squire' } },
  { id: 'avatar-knight', kind: 'avatar', value: 'knight', price: 60, name: { ms: 'Kesatria', en: 'Knight' } },
  { id: 'avatar-mage', kind: 'avatar', value: 'mage', price: 60, name: { ms: 'Ahli Sihir', en: 'Mage' } },
  { id: 'avatar-owl', kind: 'avatar', value: 'owl', price: 40, name: { ms: 'Burung Hantu', en: 'Owl Scholar' } },
];

export const DEFAULT_SHOP_STATE: ShopState = { owned: [], equipped: { skin: 'stone', frame: 'bracket', avatar: 'squire' } };
