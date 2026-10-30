'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import { FRIDAY_SATURDAY_STATES, STATE_CODES, type StateCode } from '../constants/delivery.constants';
import type { DeliveryMessages } from '../i18n/delivery-messages.interface';
import { DELIVERY_MESSAGES } from '../i18n/delivery.messages';
import type { IsoWeekday, SchoolSettings } from '../interfaces/working-calendar.interface';
import { fetchSettings, PREVIEW_KEY, saveSettings, SETTINGS_KEY } from '../services/delivery.client';

const WEEKDAYS: readonly IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];
const FRIDAY_SATURDAY: IsoWeekday[] = [5, 6];

const fieldText = (reason: string | undefined, text: DeliveryMessages, lang: Lang) =>
  (reason && text.fieldErrors[reason]) || describeFieldError(reason, lang);

function SettingsForm({ initial, text }: { initial: SchoolSettings; text: DeliveryMessages }) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [workStart, setWorkStart] = useState(initial.workStart);
  const [workEnd, setWorkEnd] = useState(initial.workEnd);
  const [weekendDays, setWeekendDays] = useState<IsoWeekday[]>(initial.weekendDays);
  const [stateCode, setStateCode] = useState<StateCode | null>(initial.stateCode as StateCode | null);

  const save = useMutation({
    mutationFn: () => saveSettings({ workStart, workEnd, weekendDays, stateCode }),
    onSuccess: (saved) => {
      queryClient.setQueryData(SETTINGS_KEY, saved);
      return queryClient.invalidateQueries({ queryKey: PREVIEW_KEY });
    },
  });
  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const suggestsFridaySaturday = stateCode !== null && FRIDAY_SATURDAY_STATES.includes(stateCode)
    && weekendDays.join() !== FRIDAY_SATURDAY.join();

  const toggleDay = (day: IsoWeekday, checked: boolean) =>
    setWeekendDays((days) => (checked ? [...days, day].sort((a, b) => a - b) : days.filter((existing) => existing !== day)));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <form className={calm.card} onSubmit={onSubmit} noValidate>
      {save.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(save.error, lang)}</div>}
      {save.isSuccess && <div className={`${calm.alert} ${calm.alertOk}`} role="status">{text.saved} {text.heldUnchanged}</div>}
      <p className={calm.muted}>{text.timeZone(initial.timeZone)}</p>

      <div className={calm.grid2}>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="work-start">{text.workStart}</label>
          <input id="work-start" type="time" className={calm.input} value={workStart} onChange={(event) => setWorkStart(event.target.value)}
            aria-invalid={Boolean(fields.workStart)} aria-describedby="work-start-error" />
          <div id="work-start-error" className={calm.fieldError}>{fieldText(fields.workStart, text, lang)}</div>
        </div>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="work-end">{text.workEnd}</label>
          <input id="work-end" type="time" className={calm.input} value={workEnd} onChange={(event) => setWorkEnd(event.target.value)}
            aria-invalid={Boolean(fields.workEnd)} aria-describedby="work-end-error" />
          <div id="work-end-error" className={calm.fieldError}>{fieldText(fields.workEnd, text, lang)}</div>
        </div>
      </div>

      <div className={calm.field}>
        <label className={calm.label} htmlFor="school-state">{text.state}</label>
        <select id="school-state" className={calm.select} value={stateCode ?? ''}
          onChange={(event) => setStateCode((event.target.value || null) as StateCode | null)}>
          <option value="">{text.noState}</option>
          {STATE_CODES.map((code) => <option key={code} value={code}>{text.states[code]}</option>)}
        </select>
      </div>

      <fieldset className={calm.fieldset} aria-describedby="weekend-help weekend-error">
        <legend>{text.weekend}</legend>
        <div id="weekend-help" className={calm.help}>{text.weekendHelp}</div>
        <div className={calm.row}>
          {WEEKDAYS.map((day) => (
            <label key={day} className={calm.checkbox}>
              <input type="checkbox" checked={weekendDays.includes(day)} onChange={(event) => toggleDay(day, event.target.checked)} />
              <span>{text.weekdays[day]}</span>
            </label>
          ))}
        </div>
        {suggestsFridaySaturday && (
          <div className={`${calm.alert} ${calm.alertInfo}`}>
            {text.suggestFridaySaturday}{' '}
            <button type="button" className={calm.linkButton} onClick={() => setWeekendDays(FRIDAY_SATURDAY)}>{text.useSuggestion}</button>
          </div>
        )}
        <div id="weekend-error" className={calm.fieldError}>{fieldText(fields.weekendDays, text, lang)}</div>
      </fieldset>

      <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={save.isPending}>
        {save.isPending ? text.saving : text.save}
      </button>
    </form>
  );
}

/** Administrators: working hours, weekend and state (plan Sprint 4). The state only suggests a weekend; it never sets one. */
export function SettingsPage() {
  const text = useMessages(DELIVERY_MESSAGES);
  const { lang } = useLanguage();
  const settings = useQuery({ queryKey: SETTINGS_KEY, queryFn: fetchSettings });
  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.settingsTitle}</h1>
          <p>{text.settingsIntro}</p>
        </div>
      </div>
      {settings.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : settings.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(settings.error, lang)}</div>
      ) : (
        <SettingsForm initial={settings.data} text={text} />
      )}
    </>
  );
}
