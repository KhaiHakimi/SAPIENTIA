'use client';

import { useEffect } from 'react';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { themeStore } from './theme.store';

/** Applies the light or dark theme to <html data-theme>; globals.css does the rest. */
export function ThemeSync() {
  const mode = usePersistentStore(themeStore);
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);
  return null;
}
