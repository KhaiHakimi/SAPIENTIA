import type { Lang } from '@/shared/interfaces/localized-text.interface';
import { createPersistentStore } from '@/shared/services/persistent-store';

/** Bahasa Melayu first; English only when the student switched to it. */
export const languageStore = createPersistentStore<Lang>({
  key: 'sapientia.lang',
  defaultValue: 'ms',
  parse: (raw) => (raw === 'en' ? 'en' : 'ms'),
  serialize: (lang) => lang,
});
