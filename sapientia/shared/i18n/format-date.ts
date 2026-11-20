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

/** A calendar day (YYYY-MM-DD) in a short form for tight spaces, "Friday 20 Nov", with no year and no time-zone shift. */
export function formatDayShort(isoDay: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${isoDay}T00:00:00Z`));
}

/** A month stored as YYYY-MM, shown as "September 2026". */
export function formatMonth(isoMonth: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${isoMonth}-01T00:00:00Z`));
}

/** Today's date (YYYY-MM-DD) in a time zone: the school's "today", whatever zone the browser is in. */
export function todayInZone(timeZone: string): string {
  // The en-CA locale writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
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
