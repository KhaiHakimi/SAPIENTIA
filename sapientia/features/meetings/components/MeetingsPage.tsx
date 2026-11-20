'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDate } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { MEETING_DECLINE_REASONS } from '../constants/meetings.constants';
import { MEETINGS_MESSAGES } from '../i18n/meetings.messages';
import type { MeetingDeclineReason, TeacherMeeting } from '../interfaces/meeting.interface';
import { answerMeeting, fetchMyMeetings, MY_MEETINGS_KEY } from '../services/meetings.client';
import styles from '../styles/Meetings.module.css';

const STATUS_BADGE = { pending: calm.badgeAccent, accepted: calm.badgeOk, declined: calm.badgeDanger, withdrawn: '', cancelled: '' } as const;

/**
 * Staff: guardians' meeting requests to me (plan Phase 4, Sprint 13 part 2). Only requests that have reached me in working
 * hours are listed. I see the guardian's name only, and answer with a time in working hours or a reason from a list.
 */
export function MeetingsPage() {
  const text = useMessages(MEETINGS_MESSAGES);
  const { lang } = useLanguage();
  const meetings = useQuery({ queryKey: MY_MEETINGS_KEY, queryFn: fetchMyMeetings });

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
          <p className={calm.help}>{text.privacyNote}</p>
        </div>
      </div>
      <section className={calm.card} aria-label={text.title}>
        {meetings.isPending ? (
          <p className={calm.loading} role="status">{text.loading}</p>
        ) : meetings.isError ? (
          <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(meetings.error, lang)}</div>
        ) : meetings.data.items.length === 0 ? (
          <p className={calm.empty}>{text.empty}</p>
        ) : (
          <div className={calm.tableWrap}>
            <table className={calm.table}>
              <thead>
                <tr>
                  <th scope="col">{text.columns.received}</th>
                  <th scope="col">{text.columns.guardian}</th>
                  <th scope="col">{text.columns.pupil}</th>
                  <th scope="col">{text.columns.topic}</th>
                  <th scope="col">{text.columns.timeOfDay}</th>
                  <th scope="col">{text.columns.status}</th>
                </tr>
              </thead>
              <tbody>
                {meetings.data.items.map((meeting) => (
                  <MeetingRow key={meeting.id} meeting={meeting} timeZone={meetings.data.timeZone} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function MeetingRow({ meeting, timeZone }: { meeting: TeacherMeeting; timeZone: string }) {
  const text = useMessages(MEETINGS_MESSAGES);
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const when = (iso: string) => formatDate(iso, lang, { withTime: true, timeZone });
  const panelId = `meeting-${meeting.id}-panel`;

  return (
    <>
      <tr>
        <td>{when(meeting.receivedAt)}</td>
        <td>{meeting.guardianName}</td>
        <td>{meeting.className ? `${meeting.pupilName} (${meeting.className})` : meeting.pupilName}</td>
        <td>{text.topics[meeting.topic]}</td>
        <td>{text.timesOfDay[meeting.timeOfDay]}</td>
        <td>
          <span className={`${calm.badge} ${STATUS_BADGE[meeting.status]}`}>{text.statuses[meeting.status]}</span>
          {meeting.meetingAt && <div className={calm.help}>{when(meeting.meetingAt)}</div>}
          {meeting.declineReason && <div className={calm.help}>{text.declineReasons[meeting.declineReason]}</div>}
          {meeting.status === 'pending' && (
            <div>
              <button type="button" className={`${calm.button} ${calm.small}`} aria-expanded={open} aria-controls={panelId}
                aria-label={text.answer(meeting.guardianName)} onClick={() => setOpen((shown) => !shown)}>
                {open ? text.close : text.answerButton}
              </button>
            </div>
          )}
        </td>
      </tr>
      {open && meeting.status === 'pending' && (
        <tr className={styles.panel}>
          <td colSpan={6} id={panelId}>
            <AnswerForms meeting={meeting} onDone={() => setOpen(false)} />
          </td>
        </tr>
      )}
    </>
  );
}

function AnswerForms({ meeting, onDone }: { meeting: TeacherMeeting; onDone: () => void }) {
  const text = useMessages(MEETINGS_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState<MeetingDeclineReason>('not_available');
  const refresh = () => queryClient.invalidateQueries({ queryKey: MY_MEETINGS_KEY });
  const accept = useMutation({ mutationFn: () => answerMeeting(meeting.id, { answer: 'accept', date, time }), onSuccess: async () => {
    onDone();
    await refresh();
  } });
  const decline = useMutation({ mutationFn: () => answerMeeting(meeting.id, { answer: 'decline', reason }), onSuccess: async () => {
    onDone();
    await refresh();
  } });
  const fields = accept.error instanceof ApiError ? accept.error.fields : {};
  const fieldText = (code: string | undefined) => (code ? (text.fieldErrors[code] ?? describeFieldError(code, lang)) : undefined);
  const dateError = fieldText(fields.date);
  const timeError = fieldText(fields.time);
  const acceptOther = accept.isError && !fields.date && !fields.time;
  const id = (name: string) => `meeting-${meeting.id}-${name}`;
  const failureText = (error: unknown) => {
    const code = error instanceof ApiError ? Object.values(error.fields)[0] : undefined;
    return (code && text.fieldErrors[code]) ?? describeApiError(error, lang);
  };

  const onAccept = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    accept.mutate();
  };
  const onDecline = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    decline.mutate();
  };

  return (
    <div className={styles.answer}>
      <form onSubmit={onAccept} noValidate>
        <fieldset className={calm.fieldset}>
          <legend>{text.acceptTitle}</legend>
          <div className={styles.formGrid}>
            <div className={calm.field}>
              <label className={calm.label} htmlFor={id('date')}>{text.date}</label>
              <input id={id('date')} type="date" className={calm.input} value={date} onChange={(event) => setDate(event.target.value)}
                aria-invalid={dateError ? true : undefined} aria-describedby={dateError ? id('date-error') : undefined} />
              {dateError && <p id={id('date-error')} className={calm.fieldError}>{dateError}</p>}
            </div>
            <div className={calm.field}>
              <label className={calm.label} htmlFor={id('time')}>{text.time}</label>
              <input id={id('time')} type="time" className={calm.input} value={time} onChange={(event) => setTime(event.target.value)}
                aria-invalid={timeError ? true : undefined} aria-describedby={timeError ? id('time-error') : id('time-help')} />
              {timeError
                ? <p id={id('time-error')} className={calm.fieldError}>{timeError}</p>
                : <p id={id('time-help')} className={calm.help}>{text.timeHelp}</p>}
            </div>
          </div>
          <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={accept.isPending}>{text.accept}</button>
          {acceptOther && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{failureText(accept.error)}</div>}
        </fieldset>
      </form>
      <form onSubmit={onDecline} noValidate>
        <fieldset className={calm.fieldset}>
          <legend>{text.declineTitle}</legend>
          <div className={calm.field}>
            <label className={calm.label} htmlFor={id('reason')}>{text.declineReason}</label>
            <select id={id('reason')} className={calm.select} value={reason}
              onChange={(event) => setReason(event.target.value as MeetingDeclineReason)}>
              {MEETING_DECLINE_REASONS.map((code) => <option key={code} value={code}>{text.declineReasons[code]}</option>)}
            </select>
          </div>
          <button type="submit" className={calm.button} disabled={decline.isPending}>{text.decline}</button>
          {decline.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{failureText(decline.error)}</div>}
        </fieldset>
      </form>
    </div>
  );
}
