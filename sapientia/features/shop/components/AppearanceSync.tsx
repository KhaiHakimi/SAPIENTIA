'use client';

import { useEffect } from 'react';
import { usePupilStore } from '@/shared/components/PupilStoreProvider';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { shopStores } from '../services/shop.store';

/** Applies the worn skin and card frame to <html data-skin / data-frame>; globals.css turns those into colours and scenes. */
export function AppearanceSync() {
  const { skin, frame } = usePersistentStore(usePupilStore(shopStores)).equipped;
  useEffect(() => {
    document.documentElement.dataset.skin = skin;
    document.documentElement.dataset.frame = frame;
  }, [skin, frame]);
  return null;
}
