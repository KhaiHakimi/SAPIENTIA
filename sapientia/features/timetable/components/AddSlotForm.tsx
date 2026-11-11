'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { IsoWeekday } from '@/features/delivery/interfaces/working-calendar.interface';
import { fetchSchoolData, schoolDataKey } from '@/features/school-data/services/school-data.client';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage } from '@/shared/i18n/useLanguage';
import { SLOT_LABEL_MAX, WEEKDAYS } from '../constants/timetable.constants';
import type { SlotKind, TimetableMessages } from '../i18n/timetable-messages.interface';
import { addTimetableSlot, TIMETABLE_KEY } from '../services/timetable.client';

const KINDS: readonly SlotKind[] = ['lesson', 'duty'];

/** Administrators add one weekly period for the chosen teacher: a lesson (class and subject) or another fixed duty. */
export function AddSlotForm({ teacherId, text }: { teacherId: string; text: TimetableMessages }) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const classes = useQuery({ queryKey: schoolDataKey('classes'), queryFn: () => fetchSchoolData('classes') });
  const subjects = useQuery({ queryKey: schoolDataKey('subjects'), queryFn: () => fetchSchoolData('subjects') });
  const [weekday, setWeekday] = useState<IsoWeekday>(1);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [kind, setKind] = useState<SlotKind>('lesson');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [label, setLabel] = useState('');

  const add = useMutation({
    mutationFn: () => addTimetableSlot({
      teacherId, weekday, startTime, endTime,
      ...(kind === 'lesson' ? { classId: classId || undefined, subjectId: subjectId || undefined } : { label }),
    }),
    onSuccess: () => {
      // Keep the day and type: periods are usually entered one after another. The next one starts where this one ended.
      setStartTime(endTime);
      setEndTime('');
      return queryClient.invalidateQueries({ queryKey: TIMETABLE_KEY });
    },
  });
  const fields = add.error instanceof ApiError ? add.error.fields : {};
  const fieldText = (reason: string | undefined) => (reason && text.fieldErrors[reason]) || describeFieldError(reason, lang);
  const noSchoolData = classes.data?.length === 0 || subjects.data?.length === 0;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    add.mutate();
  };

  return (
    <form className={calm.card} onSubmit={onSubmit} noValidate aria-labelledby="add-slot-title">
      <h2 id="add-slot-title">{text.addTitle}</h2>
      {add.isError && !Object.keys(fields).length && (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(add.error, lang)}</div>
      )}
      {fields.teacherId && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{fieldText(fields.teacherId)}</div>}

      <div className={calm.field}>
        <label className={calm.label} htmlFor="slot-day">{text.day}</label>
        <select id="slot-day" className={calm.select} value={weekday} onChange={(event) => setWeekday(Number(event.target.value) as IsoWeekday)}>
          {WEEKDAYS.map((day) => <option key={day} value={day}>{text.weekdays[day]}</option>)}
        </select>
      </div>
      <div className={calm.field}>
        <label className={calm.label} htmlFor="slot-start">{text.startTime}</label>
        <input id="slot-start" type="time" className={calm.input} value={startTime} onChange={(event) => setStartTime(event.target.value)}
          aria-invalid={Boolean(fields.startTime)} aria-describedby="slot-start-error" />
        <div id="slot-start-error" className={calm.fieldError}>{fieldText(fields.startTime)}</div>
      </div>
      <div className={calm.field}>
        <label className={calm.label} htmlFor="slot-end">{text.endTime}</label>
        <input id="slot-end" type="time" className={calm.input} value={endTime} onChange={(event) => setEndTime(event.target.value)}
          aria-invalid={Boolean(fields.endTime)} aria-describedby="slot-end-error" />
        <div id="slot-end-error" className={calm.fieldError}>{fieldText(fields.endTime)}</div>
      </div>

      <fieldset className={calm.fieldset}>
        <legend>{text.kind}</legend>
        {KINDS.map((option) => (
          <label key={option} className={calm.checkbox}>
            <input type="radio" name="slot-kind" value={option} checked={kind === option} onChange={() => setKind(option)} />
            <span>{text.kinds[option]}</span>
          </label>
        ))}
      </fieldset>

      {kind === 'lesson' ? (
        <>
          {noSchoolData && <p className={calm.help}>{text.noSchoolData}</p>}
          <div className={calm.field}>
            <label className={calm.label} htmlFor="slot-class">{text.class}</label>
            <select id="slot-class" className={calm.select} value={classId} onChange={(event) => setClassId(event.target.value)}
              aria-invalid={Boolean(fields.classId)} aria-describedby="slot-class-error">
              <option value="">{text.choose}</option>
              {(classes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <div id="slot-class-error" className={calm.fieldError}>{fieldText(fields.classId)}</div>
          </div>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="slot-subject">{text.subject}</label>
            <select id="slot-subject" className={calm.select} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}
              aria-invalid={Boolean(fields.subjectId)} aria-describedby="slot-subject-error">
              <option value="">{text.choose}</option>
              {(subjects.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {/* With neither chosen the server names the label field, which a lesson does not show: say what a lesson needs. */}
            <div id="slot-subject-error" className={calm.fieldError}>
              {fieldText(fields.subjectId ?? (fields.label ? 'lesson_needs_both' : undefined))}
            </div>
          </div>
        </>
      ) : (
        <div className={calm.field}>
          <label className={calm.label} htmlFor="slot-label">{text.label}</label>
          <input id="slot-label" className={calm.input} value={label} placeholder={text.labelPlaceholder} maxLength={SLOT_LABEL_MAX}
            onChange={(event) => setLabel(event.target.value)} aria-invalid={Boolean(fields.label)} aria-describedby="slot-label-error" />
          <div id="slot-label-error" className={calm.fieldError}>{fieldText(fields.label)}</div>
        </div>
      )}

      <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={add.isPending}>
        {add.isPending ? text.adding : text.add}
      </button>
    </form>
  );
}
