import type { Lang } from '@/shared/interfaces/localized-text.interface';

const LOCALES: Record<Lang, string> = { ms: 'ms-MY', en: 'en-GB' };

/** A calendar day stored as YYYY-MM-DD, shown as "19 September 2026" (weekday optional) with no time-zone shift. */
export function formatDay(isoDay: string, lang: Lang, options: { weekday?: boolean } = {}): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: options.weekday ? 'long' : undefined,
    timeZone: 'UTC',
  }).format(new Date(`${isoDay}T00:00:00Z`));
}

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
