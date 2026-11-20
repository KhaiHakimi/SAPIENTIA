import type { Lang, TextOrLocalized } from '@/shared/interfaces/localized-text.interface';

export function pickText(value: TextOrLocalized, lang: Lang): string {
  return typeof value === 'string' ? value : value[lang];
}
