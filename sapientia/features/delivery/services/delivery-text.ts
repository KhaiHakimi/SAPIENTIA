import { DateTime } from 'luxon';
import type { Lang } from '@/shared/interfaces/localized-text.interface';

/** Malay time of day as people say it, rather than the PG/PTG abbreviations Intl gives. */
function malayPeriod(hour: number): string {
  if (hour < 12) return 'pagi';
  if (hour < 14) return 'tengah hari';
  if (hour < 19) return 'petang';
  return 'malam';
}

/**
 * A delivery time in the school's time zone, in plain words (plan Sprint 4): "Isnin 9 November, 7:30 pagi" or
 * "Monday 9 November, 7:30 am". The year is added only when it is not this year.
 */
export function describeDeliveryTime(iso: string, timeZone: string, lang: Lang, now: Date = new Date()): string {
  const local = DateTime.fromISO(iso, { zone: timeZone }).setLocale(lang === 'ms' ? 'ms' : 'en-GB');
  const sameYear = local.year === DateTime.fromJSDate(now, { zone: timeZone }).year;
  const day = local.toFormat(sameYear ? 'cccc d LLLL' : 'cccc d LLLL yyyy');
  const hour12 = local.hour % 12 === 0 ? 12 : local.hour % 12;
  const minutes = local.toFormat('mm');
  const time = lang === 'ms' ? `${hour12}:${minutes} ${malayPeriod(local.hour)}` : `${hour12}:${minutes} ${local.hour < 12 ? 'am' : 'pm'}`;
  return `${day}, ${time}`;
}
