import type { Lang } from '@/shared/interfaces/localized-text.interface';

/** "2 jam 30 minit" / "2 hours 30 minutes"; whole hours and short times drop the part that is zero. */
export function formatDuration(totalMinutes: number, lang: Lang): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts: string[] = [];
  if (lang === 'ms') {
    if (hours > 0) parts.push(`${hours} jam`);
    if (rest > 0 || hours === 0) parts.push(`${rest} minit`);
  } else {
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    if (rest > 0 || hours === 0) parts.push(`${rest} ${rest === 1 ? 'minute' : 'minutes'}`);
  }
  return parts.join(' ');
}
