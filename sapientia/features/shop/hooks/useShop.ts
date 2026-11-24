'use client';

import { usePupilStore } from '@/shared/components/PupilStoreProvider';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import type { ShopItem, ShopState } from '../interfaces/shop-item.interface';
import { buyItem, equipItem, type BuyResult } from '../services/shop.service';
import { shopStores } from '../services/shop.store';

export interface ShopApi {
  state: ShopState;
  buy: (item: ShopItem, balance: number) => BuyResult['outcome'];
  equip: (item: ShopItem) => void;
}

export function useShop(): ShopApi {
  const store = usePupilStore(shopStores);
  const state = usePersistentStore(store);
  return {
    state,
    buy(item, balance) {
      const result = buyItem(store.getSnapshot(), item, balance);
      if (result.outcome === 'bought') store.set(result.state);
      return result.outcome;
    },
    equip(item) {
      store.set((current) => equipItem(current, item));
    },
  };
}
