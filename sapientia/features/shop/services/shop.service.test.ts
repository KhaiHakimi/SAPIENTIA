import { describe, expect, it } from 'vitest';
import { DEFAULT_SHOP_STATE } from '../data/shop-catalogue';
import { buyItem, equipItem, isOwned, itemById, parseShopState, spentCoins } from './shop.service';

const royal = itemById('skin-royal')!;
const stone = itemById('skin-stone')!;

describe('shop', () => {
  it('owns free items from the start', () => {
    expect(isOwned(DEFAULT_SHOP_STATE, stone)).toBe(true);
    expect(isOwned(DEFAULT_SHOP_STATE, royal)).toBe(false);
  });

  it('buys and wears an item when the student can afford it', () => {
    const result = buyItem(DEFAULT_SHOP_STATE, royal, 100);
    expect(result.outcome).toBe('bought');
    expect(result.state.equipped.skin).toBe('royal');
    expect(spentCoins(result.state)).toBe(80);
  });

  it('refuses when there are not enough coins, and never buys twice', () => {
    expect(buyItem(DEFAULT_SHOP_STATE, royal, 79).outcome).toBe('not-enough-coins');
    const owned = buyItem(DEFAULT_SHOP_STATE, royal, 100).state;
    expect(buyItem(owned, royal, 100).outcome).toBe('already-owned');
  });

  it('only equips owned items', () => {
    expect(equipItem(DEFAULT_SHOP_STATE, royal).equipped.skin).toBe('stone');
  });

  it('ignores saved data that does not match the catalogue', () => {
    const state = parseShopState(JSON.stringify({ owned: ['skin-royal', 'skin-made-up', 'skin-stone', 42], equipped: { skin: 'ember', frame: 'crown', avatar: 'squire' } }));
    expect(state.owned).toEqual(['skin-royal']); // free and unknown ids dropped
    expect(state.equipped.skin).toBe('stone'); // ember is not owned
    expect(state.equipped.frame).toBe('bracket'); // crown is not owned
    expect(parseShopState('{broken')).toEqual(DEFAULT_SHOP_STATE);
  });
});
