import { createPersistentStore } from '@/shared/services/persistent-store';

export type ThemeMode = 'dark' | 'light';

export const themeStore = createPersistentStore<ThemeMode>({
  key: 'sapientia.theme',
  defaultValue: 'dark',
  parse: (raw) => (raw === 'light' ? 'light' : 'dark'),
  serialize: (mode) => mode,
});

export const toggleTheme = () => themeStore.set((mode) => (mode === 'light' ? 'dark' : 'light'));
