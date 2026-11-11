'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ESTIMATE_MAX_MINUTES, ESTIMATE_MIN_MINUTES } from '@/features/capacity/constants/capacity.constants';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage } from '@/shared/i18n/useLanguage';
import { SCHOOL_DATA_NAME_MAX } from '../constants/school-data.constants';
import type { SchoolDataMessages } from '../i18n/school-data-messages.interface';
import type { SchoolDataItem, SchoolDataKind } from '../interfaces/school-data.interface';
import { addSchoolData, fetchSchoolData, removeSchoolData, schoolDataKey } from '../services/school-data.client';

interface ListProps {
  kind: SchoolDataKind;
  text: SchoolDataMessages;
}

function RemoveButton({ kind, item, text }: ListProps & { item: SchoolDataItem }) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => removeSchoolData(kind, item.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schoolDataKey(kind) }),
  });
  const reason = remove.error instanceof ApiError ? remove.error.fields.id : undefined;
  return (
    <>
      <button type="button" className={`${calm.button} ${calm.small} ${calm.danger}`} aria-label={text.removeLabel(item.name)}
        onClick={() => remove.mutate()} disabled={remove.isPending}>
        {remove.isPending ? text.removing : text.remove}
      </button>
      {remove.isError && (
        <div className={calm.fieldError} role="alert">{(reason && text.fieldErrors[reason]) || describeApiError(remove.error, lang)}</div>
      )}
    </>
  );
}

/** One of the school's lists (subjects, classes or task types): what is there, a form to add, and a button to remove. */
export function SchoolDataList({ kind, text }: ListProps) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const list = text.lists[kind];
  const withEstimate = kind === 'task-types';
  const items = useQuery({ queryKey: schoolDataKey(kind), queryFn: () => fetchSchoolData(kind) });
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('');

  const add = useMutation({
    mutationFn: () => addSchoolData(kind, withEstimate ? { name, estimatedMinutes: Number(minutes) } : { name }),
    onSuccess: () => {
      setName('');
      setMinutes('');
      return queryClient.invalidateQueries({ queryKey: schoolDataKey(kind) });
    },
  });
  const fields = add.error instanceof ApiError ? add.error.fields : {};
  const fieldText = (reason: string | undefined) => (reason && text.fieldErrors[reason]) || describeFieldError(reason, lang);
  const titleId = `${kind}-title`;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    add.mutate();
  };

  return (
    <section className={calm.card} aria-labelledby={titleId}>
      <h2 id={titleId}>{list.title}</h2>
      <p className={calm.muted}>{list.intro}</p>

      <form onSubmit={onSubmit} noValidate>
        {add.isError && !Object.keys(fields).length && (
          <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(add.error, lang)}</div>
        )}
        <div className={calm.field}>
          <label className={calm.label} htmlFor={`${kind}-name`}>{list.nameLabel}</label>
          <input id={`${kind}-name`} className={calm.input} value={name} placeholder={list.namePlaceholder} maxLength={SCHOOL_DATA_NAME_MAX}
            onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(fields.name)} aria-describedby={`${kind}-name-error`} />
          <div id={`${kind}-name-error`} className={calm.fieldError}>{fieldText(fields.name)}</div>
        </div>
        {withEstimate && (
          <div className={calm.field}>
            <label className={calm.label} htmlFor={`${kind}-minutes`}>{text.estimateLabel}</label>
            <input id={`${kind}-minutes`} type="number" inputMode="numeric" className={calm.input} value={minutes}
              min={ESTIMATE_MIN_MINUTES} max={ESTIMATE_MAX_MINUTES} step={5} onChange={(event) => setMinutes(event.target.value)}
              aria-invalid={Boolean(fields.estimatedMinutes)} aria-describedby={`${kind}-minutes-help ${kind}-minutes-error`} />
            <div id={`${kind}-minutes-help`} className={calm.help}>{text.estimateHelp}</div>
            <div id={`${kind}-minutes-error`} className={calm.fieldError}>{fieldText(fields.estimatedMinutes)}</div>
          </div>
        )}
        <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={add.isPending}>
          {add.isPending ? text.adding : text.add}
        </button>
      </form>

      {items.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : items.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(items.error, lang)}</div>
      ) : items.data.length === 0 ? (
        <p className={calm.empty}>{list.empty}</p>
      ) : (
        <div className={calm.tableWrap}>
          <table className={calm.table}>
            <thead>
              <tr>
                <th scope="col">{text.columns.name}</th>
                {withEstimate && <th scope="col">{text.columns.estimate}</th>}
                <th scope="col"><span className="sr-only">{text.columns.actions}</span></th>
              </tr>
            </thead>
            <tbody>
              {items.data.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  {withEstimate && <td>{item.estimatedMinutes === null ? '' : text.minutes(item.estimatedMinutes)}</td>}
                  <td><RemoveButton kind={kind} item={item} text={text} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
