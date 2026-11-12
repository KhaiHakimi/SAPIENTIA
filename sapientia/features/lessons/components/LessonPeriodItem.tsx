'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { TIMETABLE_MESSAGES } from '@/features/timetable/i18n/timetable.messages';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { ERPH_URL_MAX, LESSON_NOTE_MAX, NOT_HELD_REASONS } from '../constants/lessons.constants';
import { LESSONS_MESSAGES } from '../i18n/lessons.messages';
import type { LessonPeriod, LessonRecordInput, NotHeldReason } from '../interfaces/lesson.interface';
import { lessonDayKey, saveLessonRecord } from '../services/lessons.client';
import styles from '../styles/Lessons.module.css';

/**
 * One period of the day (plan Phase 3). "Held" saves in one tap. "Not held" opens a short form for the reason. Once a
 * record exists, an e-RPH link can be added to it. Only the period's recorder sees the buttons; everyone else sees the state.
 */
export function LessonPeriodItem({ period, onDate }: { period: LessonPeriod; onDate: string }) {
  const text = useMessages(LESSONS_MESSAGES);
  const timetable = useMessages(TIMETABLE_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const { slot, record } = period;
  const [notHeldOpen, setNotHeldOpen] = useState(false);
  const [reason, setReason] = useState<NotHeldReason | ''>(record?.reason ?? '');
  const [note, setNote] = useState(record?.note ?? '');
  const [erphUrl, setErphUrl] = useState(record?.erphUrl ?? '');

  const save = useMutation({
    mutationFn: saveLessonRecord,
    onSuccess: async () => {
      setNotHeldOpen(false);
      await queryClient.invalidateQueries({ queryKey: lessonDayKey(onDate) });
    },
  });
  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const fieldText = (code: string | undefined) => code && (text.fieldErrors[code] ?? describeFieldError(code, lang));
  const reasonError = fieldText(fields.reason);
  const linkError = fieldText(fields.erphUrl);

  const time = timetable.timeRange(slot.startTime, slot.endTime);
  const what = slot.class && slot.subject ? timetable.lesson(slot.class.name, slot.subject.name) : slot.label;
  const base = { slotId: slot.id, onDate };
  const keepLink = record?.erphUrl ?? undefined;
  const send = (input: LessonRecordInput) => save.mutate(input);
  const idPrefix = `lesson-${slot.id}`;

  const onNotHeld = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send({ ...base, status: 'not_held', reason: reason || undefined, note: note.trim() || undefined, erphUrl: keepLink });
  };
  const onLink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!record) return;
    const { status, reason: keptReason, note: keptNote } = record;
    send({ ...base, status, reason: keptReason ?? undefined, note: keptNote ?? undefined, erphUrl: erphUrl.trim() || undefined });
  };

  const stateText = !record
    ? text.notRecorded
    : record.status === 'held'
      ? text.recordedHeld
      : text.recordedNotHeld(record.reason ? text.reasons[record.reason] : '');

  return (
    <li className={styles.period}>
      <div className={styles.periodHead}>
        <div>
          <p><strong>{time}</strong> · {what}</p>
          {period.absentTeacher && <p className={calm.muted}>{text.coveringFor(period.absentTeacher.name)}</p>}
          {period.coveredBy && <p className={calm.muted}>{text.coveredBy(period.coveredBy.name)}</p>}
        </div>
        <span className={`${calm.badge} ${record?.status === 'held' ? calm.badgeOk : record ? calm.badgeDanger : ''}`}>{stateText}</span>
      </div>
      {record?.note && <p className={calm.help}>{record.note}</p>}
      {record?.erphUrl && (
        <p><a href={record.erphUrl} target="_blank" rel="noopener noreferrer">{text.erphOpen}</a></p>
      )}

      {!period.canRecord ? (
        !record && !period.coveredBy && <p className={calm.help}>{text.notStarted}</p>
      ) : (
        <>
          <div className={styles.choices}>
            <button type="button" className={`${calm.button} ${calm.small} ${record?.status === 'held' ? calm.primary : ''}`}
              aria-pressed={record?.status === 'held'} aria-label={text.heldLabel(time)} disabled={save.isPending}
              onClick={() => send({ ...base, status: 'held', erphUrl: keepLink })}>
              {text.held}
            </button>
            <button type="button" className={`${calm.button} ${calm.small} ${record?.status === 'not_held' ? calm.primary : ''}`}
              aria-pressed={record?.status === 'not_held'} aria-label={text.notHeldLabel(time)} aria-expanded={notHeldOpen}
              disabled={save.isPending} onClick={() => setNotHeldOpen((open) => !open)}>
              {text.notHeld}
            </button>
          </div>

          {notHeldOpen && (
            <form className={styles.form} onSubmit={onNotHeld} noValidate>
              <div className={calm.field}>
                <label className={calm.label} htmlFor={`${idPrefix}-reason`}>{text.reason}</label>
                <select id={`${idPrefix}-reason`} className={calm.select} value={reason}
                  onChange={(event) => setReason(event.target.value as NotHeldReason | '')}
                  aria-invalid={Boolean(reasonError)} aria-describedby={`${idPrefix}-reason-error`}>
                  <option value="">{text.chooseReason}</option>
                  {NOT_HELD_REASONS.map((option) => <option key={option} value={option}>{text.reasons[option]}</option>)}
                </select>
                <div id={`${idPrefix}-reason-error`} className={calm.fieldError} role={reasonError ? 'alert' : undefined}>{reasonError ?? ''}</div>
              </div>
              <div className={calm.field}>
                <label className={calm.label} htmlFor={`${idPrefix}-note`}>{text.note} <span className={calm.muted}>({text.optional})</span></label>
                <input id={`${idPrefix}-note`} className={calm.input} value={note} maxLength={LESSON_NOTE_MAX}
                  onChange={(event) => setNote(event.target.value)} aria-describedby={`${idPrefix}-note-help`} />
                <div id={`${idPrefix}-note-help`} className={calm.help}>{text.noteHelp}</div>
              </div>
              <div className={styles.actions}>
                <button type="submit" className={`${calm.button} ${calm.primary} ${calm.small}`} disabled={save.isPending}>
                  {save.isPending ? text.saving : text.save}
                </button>
                <button type="button" className={`${calm.button} ${calm.small}`} onClick={() => setNotHeldOpen(false)}>{text.cancel}</button>
              </div>
            </form>
          )}

          {record && (
            <form className={styles.form} onSubmit={onLink} noValidate>
              <div className={calm.field}>
                <label className={calm.label} htmlFor={`${idPrefix}-erph`}>{text.erph} <span className={calm.muted}>({text.optional})</span></label>
                <input id={`${idPrefix}-erph`} type="url" inputMode="url" className={calm.input} value={erphUrl} maxLength={ERPH_URL_MAX}
                  placeholder="https://" onChange={(event) => setErphUrl(event.target.value)} aria-invalid={Boolean(linkError)}
                  aria-describedby={`${idPrefix}-erph-help ${idPrefix}-erph-error`} />
                <div id={`${idPrefix}-erph-help`} className={calm.help}>{text.erphHelp}</div>
                <div id={`${idPrefix}-erph-error`} className={calm.fieldError} role={linkError ? 'alert' : undefined}>{linkError ?? ''}</div>
              </div>
              <div className={styles.actions}>
                <button type="submit" className={`${calm.button} ${calm.small}`} disabled={save.isPending}>{text.saveErph}</button>
              </div>
            </form>
          )}

          <div className={save.isError && !reasonError && !linkError ? calm.fieldError : calm.help} aria-live="polite">
            {save.isPending ? text.saving : save.isError ? (reasonError || linkError ? '' : describeApiError(save.error, lang)) : save.isSuccess ? text.saved : ''}
          </div>
        </>
      )}
    </li>
  );
}
