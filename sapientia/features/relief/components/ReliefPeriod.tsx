'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { formatDuration } from '@/features/capacity/services/duration-text';
import { describeDeliveryTime } from '@/features/delivery/services/delivery-text';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import { TIMETABLE_MESSAGES } from '@/features/timetable/i18n/timetable.messages';
import type { TimetableSlot } from '@/features/timetable/interfaces/timetable.interface';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { ReliefMessages } from '../i18n/relief-messages.interface';
import { RELIEF_MESSAGES } from '../i18n/relief.messages';
import type { ReliefCover } from '../interfaces/relief.interface';
import { assignRelief, cancelRelief, fetchReliefSuggestions, RELIEF_KEY, reliefSuggestionsKey } from '../services/relief.client';
import styles from '../styles/Relief.module.css';

/** The server names the field and the reason; the first one it gives is what the administrator needs to read. */
function describeReliefError(error: unknown, text: ReliefMessages, lang: Lang): string {
  const reason = error instanceof ApiError ? Object.values(error.fields)[0] : undefined;
  return (reason && text.fieldErrors[reason]) || describeApiError(error, lang);
}

function Suggestions({ slot, onDate, onDone }: { slot: TimetableSlot; onDate: string; onDone: () => void }) {
  const text = useMessages(RELIEF_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  // Who is free changes as other relief is arranged, so the list is asked for afresh each time it is opened.
  const suggestions = useQuery({
    queryKey: reliefSuggestionsKey(slot.id, onDate), queryFn: () => fetchReliefSuggestions(slot.id, onDate), staleTime: 0,
  });
  const assign = useMutation({
    mutationFn: (reliefTeacherId: string) => assignRelief({ slotId: slot.id, onDate, reliefTeacherId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: RELIEF_KEY });
      onDone();
    },
    // Someone else may have taken the teacher or covered the period a moment ago: show what is true now.
    onError: () => queryClient.invalidateQueries({ queryKey: RELIEF_KEY }),
  });

  if (suggestions.isPending) return <p className={calm.loading} role="status">{text.loading}</p>;
  if (suggestions.isError) {
    return <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeReliefError(suggestions.error, text, lang)}</div>;
  }
  if (suggestions.data.items.length === 0) return <p className={calm.muted} role="status">{text.noOneFree}</p>;

  return (
    <div>
      <p className={calm.help}>{text.suggestionsNote}</p>
      <ul className={styles.suggestions}>
        {suggestions.data.items.map((item) => (
          <li key={item.teacher.id} className={styles.suggestion}>
            <span>
              <strong>{item.teacher.name}</strong>{' '}
              <span className={calm.muted}>
                {text.suggestionLine(item.reliefThisMonth, formatDuration(item.committedMinutesThisWeek, lang))}
              </span>
            </span>
            <button type="button" className={`${calm.button} ${calm.small} ${calm.primary}`} disabled={assign.isPending}
              onClick={() => assign.mutate(item.teacher.id)}>
              {assign.isPending && assign.variables === item.teacher.id ? text.choosing : text.choose(item.teacher.name)}
            </button>
          </li>
        ))}
      </ul>
      {assign.isError && <div className={calm.fieldError} role="alert">{describeReliefError(assign.error, text, lang)}</div>}
    </div>
  );
}

function Cover({ relief, time }: { relief: ReliefCover; time: string }) {
  const text = useMessages(RELIEF_MESSAGES);
  const { lang } = useLanguage();
  const { timeZone } = useStaffUser();
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => cancelRelief(relief.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: RELIEF_KEY }),
  });
  return (
    <>
      <div className={styles.periodHead}>
        <p>
          {text.coveredBy(relief.reliefTeacher.name)}{' '}
          <span className={`${calm.badge} ${relief.held ? calm.badgeAccent : calm.badgeOk}`}>
            {relief.held ? text.heldUntil(describeDeliveryTime(relief.deliverAt, timeZone, lang)) : text.told}
          </span>
        </p>
        <button type="button" className={`${calm.button} ${calm.small} ${calm.danger}`} disabled={cancel.isPending}
          aria-label={text.cancelLabel(relief.reliefTeacher.name, time)} onClick={() => cancel.mutate()}>
          {cancel.isPending ? text.cancelling : text.cancel}
        </button>
      </div>
      {cancel.isError && <div className={calm.fieldError} role="alert">{describeApiError(cancel.error, lang)}</div>}
    </>
  );
}

interface ReliefPeriodProps {
  slot: TimetableSlot;
  relief: ReliefCover | null;
  onDate: string;
  canArrange: boolean;
}

/** One period of the absent teacher's day: who covers it, or the way to find someone who can. */
export function ReliefPeriod({ slot, relief, onDate, canArrange }: ReliefPeriodProps) {
  const text = useMessages(RELIEF_MESSAGES);
  const timetable = useMessages(TIMETABLE_MESSAGES);
  const [open, setOpen] = useState(false);
  const time = timetable.timeRange(slot.startTime, slot.endTime);

  return (
    <li className={styles.period}>
      <div className={styles.periodHead}>
        <p>
          <strong>{time}</strong>{' '}
          {slot.class && slot.subject ? timetable.lesson(slot.class.name, slot.subject.name) : slot.label}
        </p>
        {!relief && canArrange && (
          <button type="button" className={`${calm.button} ${calm.small}`} aria-expanded={open}
            aria-label={open ? undefined : text.findLabel(time)} onClick={() => setOpen((value) => !value)}>
            {open ? text.hide : text.find}
          </button>
        )}
      </div>
      {relief ? <Cover relief={relief} time={time} /> : <p className={calm.muted}>{text.notCovered}</p>}
      {!relief && canArrange && open && <Suggestions slot={slot} onDate={onDate} onDone={() => setOpen(false)} />}
    </li>
  );
}
