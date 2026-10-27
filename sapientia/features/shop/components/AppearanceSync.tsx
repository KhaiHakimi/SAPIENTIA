'use client';

import { useEffect } from 'react';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { shopStore } from '../services/shop.store';

/** Applies the worn skin and card frame to <html data-skin / data-frame>; globals.css turns those into colours and scenes. */
export function AppearanceSync() {
  const { skin, frame } = usePersistentStore(shopStore).equipped;
  useEffect(() => {
    document.documentElement.dataset.skin = skin;
    document.documentElement.dataset.frame = frame;
  }, [skin, frame]);
  return null;
}
