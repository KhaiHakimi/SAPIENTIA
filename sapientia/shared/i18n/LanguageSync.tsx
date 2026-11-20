'use client';

import { useEffect } from 'react';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { languageStore } from './language.store';

/** Keeps <html lang> in step with the chosen language, so screen readers pronounce the page correctly. */
export function LanguageSync() {
  const lang = usePersistentStore(languageStore);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
