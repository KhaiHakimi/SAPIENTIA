'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { todayInZone } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { HOURS_KINDS, HOURS_NOTE_MAX } from '../constants/hours.constants';
import { HOURS_MESSAGES } from '../i18n/hours.messages';
import type { HoursKind } from '../interfaces/hours.interface';
import { addHoursEntry } from '../services/hours.client';
import styles from '../styles/Hours.module.css';

/** Whole hours and minutes as typed; anything that is not a whole number counts as zero. */
const toMinutes = (hours: string, minutes: string) => (Number.parseInt(hours, 10) || 0) * 60 + (Number.parseInt(minutes, 10) || 0);

/** Adds one entry to the caller's own log. Dated today by default; the server refuses future dates. */
export function AddHoursEntryForm() {
  const text = useMessages(HOURS_MESSAGES);
  const { lang } = useLanguage();
  const user = useStaffUser();
  const queryClient = useQueryClient();
  const today = todayInZone(user.timeZone);
  const [onDate, setOnDate] = useState(today);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [kind, setKind] = useState<HoursKind>('marking');
  const [note, setNote] = useState('');
  const [tooShort, setTooShort] = useState(false);

  const add = useMutation({
    mutationFn: addHoursEntry,
    onSuccess: async () => {
      setHours('');
      setMinutes('');
      setNote('');
      // The entry may belong to another month than the one on screen.
      await queryClient.invalidateQueries({ queryKey: ['hours'] });
    },
  });
  const fields = add.error instanceof ApiError ? add.error.fields : {};
  const fieldText = (code: string | undefined) => code && (text.fieldErrors[code] ?? describeFieldError(code, lang));
  const dateError = fieldText(fields.onDate);
  const timeError = tooShort ? text.needTime : fieldText(fields.minutes);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const total = toMinutes(hours, minutes);
    setTooShort(total < 1);
    if (total < 1) return;
    add.mutate({ onDate, minutes: total, kind, note: note.trim() || undefined });
  };

  return (
    <section className={calm.card} aria-labelledby="hours-add-title">
      <h2 id="hours-add-title">{text.addTitle}</h2>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <div className={styles.fields}>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="hours-date">{text.date}</label>
            <input id="hours-date" type="date" className={calm.input} value={onDate} max={today} onChange={(event) => setOnDate(event.target.value)}
              aria-invalid={Boolean(dateError)} aria-describedby="hours-date-error" />
            <div id="hours-date-error" className={calm.fieldError} role={dateError ? 'alert' : undefined}>{dateError ?? ''}</div>
          </div>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="hours-hours">{text.hours}</label>
            <input id="hours-hours" type="number" inputMode="numeric" min={0} max={24} step={1} className={calm.input} value={hours}
              onChange={(event) => setHours(event.target.value)} aria-invalid={Boolean(timeError)} aria-describedby="hours-time-help hours-time-error" />
          </div>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="hours-minutes">{text.minutes}</label>
            <input id="hours-minutes" type="number" inputMode="numeric" min={0} max={59} step={5} className={calm.input} value={minutes}
              onChange={(event) => setMinutes(event.target.value)} aria-invalid={Boolean(timeError)} aria-describedby="hours-time-help hours-time-error" />
          </div>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="hours-kind">{text.kind}</label>
            <select id="hours-kind" className={calm.select} value={kind} onChange={(event) => setKind(event.target.value as HoursKind)}>
              {HOURS_KINDS.map((option) => <option key={option} value={option}>{text.kinds[option]}</option>)}
            </select>
          </div>
        </div>
        <div id="hours-time-help" className={calm.help}>{text.timeHelp}</div>
        <div id="hours-time-error" className={calm.fieldError} role={timeError ? 'alert' : undefined}>{timeError ?? ''}</div>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="hours-note">{text.note} <span className={calm.muted}>({text.optional})</span></label>
          <input id="hours-note" className={calm.input} value={note} maxLength={HOURS_NOTE_MAX} onChange={(event) => setNote(event.target.value)}
            aria-describedby="hours-note-help" />
          <div id="hours-note-help" className={calm.help}>{text.noteHelp}</div>
        </div>
        {add.isError && !dateError && !timeError && (
          <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(add.error, lang)}</div>
        )}
        <div className={styles.actions}>
          <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={add.isPending}>{add.isPending ? text.adding : text.add}</button>
          <span className={calm.help} aria-live="polite">{add.isSuccess && !add.isPending ? text.added : ''}</span>
        </div>
      </form>
    </section>
  );
}
