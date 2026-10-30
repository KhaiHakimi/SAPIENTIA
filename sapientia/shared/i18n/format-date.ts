import type { Lang } from '@/shared/interfaces/localized-text.interface';

const LOCALES: Record<Lang, string> = { ms: 'ms-MY', en: 'en-GB' };

/** "19 September 2026, 7:30 PG" style: day, full month name, year, and the time when asked. */
export function formatDate(iso: string, lang: Lang, options: { withTime?: boolean; timeZone?: string } = {}): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(options.withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    timeZone: options.timeZone,
  }).format(new Date(iso));
}
