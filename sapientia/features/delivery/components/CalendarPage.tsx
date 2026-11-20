'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDay } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { DeliveryMessages } from '../i18n/delivery-messages.interface';
import { DELIVERY_MESSAGES } from '../i18n/delivery.messages';
import type { CalendarEvent, CalendarEventKind } from '../interfaces/working-calendar.interface';
import { addCalendarEvent, CALENDAR_KEY, fetchCalendar, PREVIEW_KEY, removeCalendarEvent } from '../services/delivery.client';

const KINDS: readonly CalendarEventKind[] = ['holiday', 'working_day'];

function RemoveButton({ event, text }: { event: CalendarEvent; text: DeliveryMessages }) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => removeCalendarEvent(event.id),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
      queryClient.invalidateQueries({ queryKey: PREVIEW_KEY }),
    ]),
  });
  return (
    <>
      <button type="button" className={`${calm.button} ${calm.small} ${calm.danger}`} aria-label={text.removeLabel(event.title)}
        onClick={() => remove.mutate()} disabled={remove.isPending}>
        {remove.isPending ? text.removing : text.remove}
      </button>
      {remove.isError && <div className={calm.fieldError} role="alert">{describeApiError(remove.error, lang)}</div>}
    </>
  );
}

/** Administrators: holidays and replacement working days, which the delivery rules read (plan Sprint 4). */
export function CalendarPage() {
  const text = useMessages(DELIVERY_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const events = useQuery({ queryKey: CALENDAR_KEY, queryFn: fetchCalendar });
  const [onDate, setOnDate] = useState('');
  const [kind, setKind] = useState<CalendarEventKind>('holiday');
  const [title, setTitle] = useState('');

  const add = useMutation({
    mutationFn: () => addCalendarEvent({ onDate, kind, title }),
    onSuccess: () => {
      setOnDate('');
      setTitle('');
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
        queryClient.invalidateQueries({ queryKey: PREVIEW_KEY }),
      ]);
    },
  });
  const fields = add.error instanceof ApiError ? add.error.fields : {};
  const fieldText = (reason: string | undefined) => (reason && text.fieldErrors[reason]) || describeFieldError(reason, lang);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    add.mutate();
  };

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.calendarTitle}</h1>
          <p>{text.calendarIntro}</p>
        </div>
      </div>
      <div className={calm.grid2}>
        <form className={calm.card} onSubmit={onSubmit} noValidate>
          {add.isError && !Object.keys(fields).length && (
            <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(add.error, lang)}</div>
          )}
          <div className={calm.field}>
            <label className={calm.label} htmlFor="event-date">{text.onDate}</label>
            <input id="event-date" type="date" className={calm.input} value={onDate} onChange={(event) => setOnDate(event.target.value)}
              aria-invalid={Boolean(fields.onDate)} aria-describedby="event-date-error" />
            <div id="event-date-error" className={calm.fieldError}>{fieldText(fields.onDate)}</div>
          </div>
          <fieldset className={calm.fieldset}>
            <legend>{text.kind}</legend>
            {KINDS.map((option) => (
              <label key={option} className={calm.checkbox}>
                <input type="radio" name="event-kind" value={option} checked={kind === option} onChange={() => setKind(option)} />
                <span>{text.kinds[option]} <span className={calm.muted}>({text.kindHelp[option]})</span></span>
              </label>
            ))}
          </fieldset>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="event-title">{text.eventTitle}</label>
            <input id="event-title" className={calm.input} value={title} placeholder={text.eventTitlePlaceholder} maxLength={120}
              onChange={(event) => setTitle(event.target.value)} aria-invalid={Boolean(fields.title)} aria-describedby="event-title-error" />
            <div id="event-title-error" className={calm.fieldError}>{fieldText(fields.title)}</div>
          </div>
          <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={add.isPending}>
            {add.isPending ? text.adding : text.add}
          </button>
        </form>

        <section className={calm.card} aria-labelledby="calendar-list-title">
          <h2 id="calendar-list-title">{text.listTitle}</h2>
          {events.isPending ? (
            <p className={calm.loading} role="status">{text.loading}</p>
          ) : events.isError ? (
            <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(events.error, lang)}</div>
          ) : events.data.length === 0 ? (
            <p className={calm.empty}>{text.empty}</p>
          ) : (
            <div className={calm.tableWrap}>
              <table className={calm.table}>
                <thead>
                  <tr>
                    <th scope="col">{text.columns.date}</th>
                    <th scope="col">{text.columns.kind}</th>
                    <th scope="col">{text.columns.title}</th>
                    <th scope="col"><span className="sr-only">{text.columns.actions}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {events.data.map((event) => (
                    <tr key={event.id}>
                      <td>{formatDay(event.onDate, lang, { weekday: true })}</td>
                      <td>
                        <span className={`${calm.badge} ${event.kind === 'holiday' ? calm.badgeAccent : calm.badgeOk}`}>{text.kinds[event.kind]}</span>
                      </td>
                      <td>{event.title}</td>
                      <td><RemoveButton event={event} text={text} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
