import { DEFAULT_SHOP_STATE, SHOP_CATALOGUE, SHOP_KINDS } from '../data/shop-catalogue';
import type { EquippedLook, ShopItem, ShopState } from '../interfaces/shop-item.interface';

/** Shop rules. Pure functions over the saved state, so the dialog, the coin total and the tests share one source of truth. */

export const itemById = (id: string): ShopItem | undefined => SHOP_CATALOGUE.find((item) => item.id === id);

export const isOwned = (state: ShopState, item: ShopItem): boolean => item.price === 0 || state.owned.includes(item.id);

export const isEquipped = (state: ShopState, item: ShopItem): boolean => state.equipped[item.kind] === item.value;

export const spentCoins = (state: ShopState): number =>
  SHOP_CATALOGUE.filter((item) => state.owned.includes(item.id)).reduce((sum, item) => sum + item.price, 0);

function wear(state: ShopState, item: ShopItem): EquippedLook {
  return { ...state.equipped, [item.kind]: item.value } as EquippedLook;
}

export type BuyResult = { outcome: 'bought'; state: ShopState } | { outcome: 'already-owned' | 'not-enough-coins'; state: ShopState };

/** A new purchase is worn straight away. */
export function buyItem(state: ShopState, item: ShopItem, balance: number): BuyResult {
  if (isOwned(state, item)) return { outcome: 'already-owned', state };
  if (balance < item.price) return { outcome: 'not-enough-coins', state };
  return { outcome: 'bought', state: { owned: [...state.owned, item.id], equipped: wear(state, item) } };
}

export function equipItem(state: ShopState, item: ShopItem): ShopState {
  return isOwned(state, item) ? { ...state, equipped: wear(state, item) } : state;
}

/** Only ids and values that exist in the catalogue are accepted, so edited or stale saved data cannot unlock or apply anything else. */
export function parseShopState(raw: string | null): ShopState {
  if (!raw) return DEFAULT_SHOP_STATE;
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return DEFAULT_SHOP_STATE;
  }
  if (!saved || typeof saved !== 'object') return DEFAULT_SHOP_STATE;
  const { owned, equipped } = saved as { owned?: unknown; equipped?: Record<string, unknown> };
  const ownedIds = (Array.isArray(owned) ? owned : []).filter((id): id is string => typeof id === 'string' && (itemById(id)?.price ?? 0) > 0);
  const state: ShopState = { owned: [...new Set(ownedIds)], equipped: { ...DEFAULT_SHOP_STATE.equipped } };
  const wanted = equipped && typeof equipped === 'object' ? equipped : {};
  let look = state.equipped;
  for (const kind of SHOP_KINDS) {
    const item = SHOP_CATALOGUE.find((candidate) => candidate.kind === kind && candidate.value === wanted[kind]);
    if (item && isOwned(state, item)) look = { ...look, [kind]: item.value } as EquippedLook;
  }
  return { ...state, equipped: look };
}
