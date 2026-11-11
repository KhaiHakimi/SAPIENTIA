'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import calm from '@/shared/calm/Calm.module.css';
import { formatDay } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { CAPACITY_MESSAGES } from '../i18n/capacity.messages';
import type { FeasibilityRequest } from '../interfaces/capacity.interface';
import { feasibilityKey, fetchFeasibility } from '../services/capacity.client';
import { formatDuration } from '../services/duration-text';

interface FeasibilityNoticeProps {
  /** Null until there are assignees, a due date and an estimate to check. */
  request: FeasibilityRequest | null;
  /** Called with the earliest date that works for everyone, when the sender chooses it. */
  onUseDate: (isoDay: string) => void;
}

/**
 * The capacity warning on the create-task form (plan Phase 2): who does not have the working time by the due date, why, and
 * the earliest date that would work. It warns and never blocks: the Send button stays as it is. The result is announced
 * politely, in words, so it does not rely on colour.
 */
export function FeasibilityNotice({ request, onUseDate }: FeasibilityNoticeProps) {
  const text = useMessages(CAPACITY_MESSAGES);
  const { lang } = useLanguage();
  const check = useQuery({
    queryKey: request ? feasibilityKey(request) : ['feasibility', 'idle'],
    queryFn: ({ signal }) => fetchFeasibility(request as FeasibilityRequest, signal),
    enabled: request !== null,
    // Keep the last answer on screen while a changed form is checked again, instead of flashing "checking".
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  if (!request) return <p className={calm.help}>{text.needsEstimate}</p>;
  if (check.isPending) return <p className={calm.help} role="status">{text.checking}</p>;
  if (check.isError) return <p className={calm.help} role="status">{text.checkFailed}</p>;

  const short = check.data.items.filter((item) => !item.feasible);
  if (short.length === 0) {
    return <div className={`${calm.alert} ${calm.alertOk}`} role="status">{text.allFit(check.data.items.length)}</div>;
  }

  // The date that works for everyone is the latest of the individual earliest dates; none if anyone has no date at all.
  const dates = short.map((item) => item.earliestDueOn);
  const sharedDate = dates.every((date): date is string => date !== null) ? dates.sort().at(-1) : undefined;
  const duration = (minutes: number) => formatDuration(minutes, lang);

  return (
    <div className={`${calm.alert} ${calm.alertInfo}`} role="status">
      <strong>{text.warningTitle(short.length, check.data.items.length)}</strong>
      <ul>
        {short.map((item) => (
          <li key={item.assignee.id}>
            {text.shortLine(item.assignee.name, duration(item.neededMinutes), duration(item.freeMinutes))}{' '}
            <span className={calm.muted}>{text.breakdown(duration(item.teachingMinutes), duration(item.committedMinutes))}</span>{' '}
            {item.earliestDueOn ? text.earliest(formatDay(item.earliestDueOn, lang, { weekday: true })) : text.noEarliest}
          </li>
        ))}
      </ul>
      {sharedDate && (
        <p>
          <button type="button" className={`${calm.button} ${calm.small}`} onClick={() => onUseDate(sharedDate)}>
            {text.useDate(formatDay(sharedDate, lang, { weekday: true }))}
          </button>
        </p>
      )}
      <p className={calm.help}>{text.stillSend}</p>
    </div>
  );
}
