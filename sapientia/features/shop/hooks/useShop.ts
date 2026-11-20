'use client';

import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import type { ShopItem, ShopState } from '../interfaces/shop-item.interface';
import { buyItem, equipItem, type BuyResult } from '../services/shop.service';
import { shopStore } from '../services/shop.store';

export interface ShopApi {
  state: ShopState;
  buy: (item: ShopItem, balance: number) => BuyResult['outcome'];
  equip: (item: ShopItem) => void;
}

export function useShop(): ShopApi {
  const state = usePersistentStore(shopStore);
  return {
    state,
    buy(item, balance) {
      const result = buyItem(shopStore.getSnapshot(), item, balance);
      if (result.outcome === 'bought') shopStore.set(result.state);
      return result.outcome;
    },
    equip(item) {
      shopStore.set((current) => equipItem(current, item));
    },
  };
}
