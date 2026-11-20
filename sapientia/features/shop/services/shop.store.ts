import { createPersistentStore } from '@/shared/services/persistent-store';
import { DEFAULT_SHOP_STATE } from '../data/shop-catalogue';
import type { ShopState } from '../interfaces/shop-item.interface';
import { parseShopState } from './shop.service';

/** Purchases and the worn look, kept in this browser. */
export const shopStore = createPersistentStore<ShopState>({
  key: 'sapientia.shop',
  defaultValue: DEFAULT_SHOP_STATE,
  parse: parseShopState,
  serialize: (state) => JSON.stringify(state),
});
