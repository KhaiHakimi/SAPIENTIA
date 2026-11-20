'use client';

import { useCallback } from 'react';
import type { Lang, TextOrLocalized } from '@/shared/interfaces/localized-text.interface';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { languageStore } from './language.store';
import { pickText } from './pick-text';

export interface LanguageApi {
  lang: Lang;
  toggleLang: () => void;
  /** Choose the current language's version of a bilingual value. */
  pick: (value: TextOrLocalized) => string;
}

export function useLanguage(): LanguageApi {
  const lang = usePersistentStore(languageStore);
  const toggleLang = useCallback(() => languageStore.set((current) => (current === 'ms' ? 'en' : 'ms')), []);
  const pick = useCallback((value: TextOrLocalized) => pickText(value, lang), [lang]);
  return { lang, toggleLang, pick };
}

/** Pick one feature's message set for the current language. */
export function useMessages<M>(messages: Record<Lang, M>): M {
  return messages[usePersistentStore(languageStore)];
}
