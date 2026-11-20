'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDuration } from '@/features/capacity/services/duration-text';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDate } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { HOURS_MESSAGES } from '../i18n/hours.messages';
import type { HoursMonth } from '../interfaces/hours.interface';
import { hoursMonthKey, shareHoursMonth, withdrawHoursShare } from '../services/hours.client';
import styles from '../styles/Hours.module.css';

/**
 * Sharing a month's total, and only the total (plan Phase 3). What is shared is the figure at the moment of sharing; the
 * card says when the live total has moved on, and the teacher decides whether to share again.
 */
export function HoursShareCard({ data, canShare }: { data: HoursMonth; canShare: boolean }) {
  const text = useMessages(HOURS_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: hoursMonthKey(data.month) });
  const share = useMutation({ mutationFn: () => shareHoursMonth(data.month), onSuccess: refresh });
  const withdraw = useMutation({ mutationFn: () => withdrawHoursShare(data.month), onSuccess: refresh });
  const working = share.isPending || withdraw.isPending;
  const failure = share.error ?? withdraw.error;
  const duration = (minutes: number) => formatDuration(minutes, lang);

  return (
    <section className={calm.card} aria-labelledby="hours-share-title">
      <h2 id="hours-share-title">{text.shareTitle}</h2>
      <p className={calm.muted}>{text.shareIntro}</p>
      <div role="status">
        {data.share ? (
          <>
            <p>{text.shared(duration(data.share.minutes), formatDate(data.share.sharedAt, lang, { withTime: true }))}</p>
            {data.share.minutes !== data.totalMinutes && <p className={calm.help}>{text.changedSince(duration(data.totalMinutes))}</p>}
          </>
        ) : (
          <p>{text.notShared}</p>
        )}
      </div>
      {canShare && (
        <div className={styles.actions}>
          <button type="button" className={`${calm.button} ${calm.primary}`} disabled={working} onClick={() => share.mutate()}>
            {data.share ? text.shareAgain : text.share}
          </button>
          {data.share && (
            <button type="button" className={calm.button} disabled={working} onClick={() => withdraw.mutate()}>{text.withdraw}</button>
          )}
        </div>
      )}
      <div className={failure ? calm.fieldError : calm.help} aria-live="polite">
        {working ? text.working : failure ? describeApiError(failure, lang) : ''}
      </div>
    </section>
  );
}
