'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDeferredValue, useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage } from '@/shared/i18n/useLanguage';
import { HOMEWORK_DETAILS_MAX, HOMEWORK_TITLE_MAX, MARKING_MAX_MINUTES, MARKING_MIN_MINUTES } from '../constants/homework.constants';
import type { HomeworkLesson, HomeworkPreviewRequest } from '../interfaces/homework.interface';
import type { HomeworkMessages } from '../i18n/homework-messages.interface';
import { HOMEWORK_ROOT_KEY, setHomework } from '../services/homework.client';
import { HomeworkPreviewNotice } from './HomeworkPreviewNotice';

interface SetHomeworkFormProps {
  text: HomeworkMessages;
  lessons: readonly HomeworkLesson[];
}

type Field = 'lesson' | 'title' | 'details' | 'dueOn' | 'markingMinutes' | 'markBy';
const EMPTY: Record<Field, string> = { lesson: '', title: '', details: '', dueOn: '', markingMinutes: '', markBy: '' };
const lessonKey = (lesson: HomeworkLesson) => `${lesson.classId}|${lesson.subjectId}`;

/** Set homework for one of the caller's own lessons (story S12-1), with the class's week and the marking check beside it. */
export function SetHomeworkForm({ text, lessons }: SetHomeworkFormProps) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(EMPTY);
  const [savedFlagged, setSavedFlagged] = useState<boolean | null>(null);
  const change = (field: Field, value: string) => setValues((current) => ({ ...current, [field]: value }));

  const lesson = lessons.find((item) => lessonKey(item) === values.lesson);
  const minutes = values.markingMinutes.trim() === '' ? undefined : Number(values.markingMinutes);
  const markBy = values.markBy || undefined;
  // The check runs once a lesson and date are chosen, and the marking pair is either complete or empty.
  const previewRequest: HomeworkPreviewRequest | null = lesson && values.dueOn && (minutes === undefined) === (markBy === undefined)
    ? { classId: lesson.classId, subjectId: lesson.subjectId, dueOn: values.dueOn, markingMinutes: minutes, markBy }
    : null;
  const deferredRequest = useDeferredValue(previewRequest);

  const save = useMutation({
    mutationFn: setHomework,
    onSuccess: (homework) => {
      setSavedFlagged(homework.loadFlagged);
      setValues((current) => ({ ...EMPTY, lesson: current.lesson }));
      void queryClient.invalidateQueries({ queryKey: HOMEWORK_ROOT_KEY });
    },
  });
  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const fieldText = (code: string | undefined) => (code ? (text.fieldErrors[code] ?? describeFieldError(code, lang)) : '');
  const errorOf = (field: Field) => fieldText(field === 'lesson' ? (fields.classId ?? fields.subjectId) : fields[field]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedFlagged(null);
    save.mutate({
      classId: lesson?.classId ?? '',
      subjectId: lesson?.subjectId ?? '',
      title: values.title,
      details: values.details || undefined,
      dueOn: values.dueOn,
      markingMinutes: minutes,
      markBy,
    });
  };

  const described = (field: Field, help?: boolean) => `${help ? `homework-${field}-help ` : ''}homework-${field}-error`;

  return (
    <section className={calm.card} aria-labelledby="set-homework-title">
      <h2 id="set-homework-title">{text.setTitle}</h2>
      {save.isError && !(save.error instanceof ApiError && save.error.code === 'validation') && (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(save.error, lang)}</div>
      )}
      {savedFlagged !== null && (
        <div className={`${calm.alert} ${savedFlagged ? calm.alertInfo : calm.alertOk}`} role="status">
          {savedFlagged ? text.savedFlagged : text.saved}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="homework-lesson">{text.lesson}</label>
          <select id="homework-lesson" className={calm.select} value={values.lesson} onChange={(event) => change('lesson', event.target.value)}
            aria-invalid={Boolean(errorOf('lesson'))} aria-describedby={described('lesson')}>
            <option value="">{text.chooseLesson}</option>
            {lessons.map((item) => (
              <option key={lessonKey(item)} value={lessonKey(item)}>{text.lessonName(item.className, item.subjectName)}</option>
            ))}
          </select>
          <div id="homework-lesson-error" className={calm.fieldError}>{errorOf('lesson')}</div>
        </div>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="homework-title">{text.homeworkTitle}</label>
          <input id="homework-title" className={calm.input} value={values.title} maxLength={HOMEWORK_TITLE_MAX}
            onChange={(event) => change('title', event.target.value)} aria-invalid={Boolean(errorOf('title'))} aria-describedby={described('title')} />
          <div id="homework-title-error" className={calm.fieldError}>{errorOf('title')}</div>
        </div>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="homework-details">{text.details}</label>
          <textarea id="homework-details" className={calm.textarea} rows={3} value={values.details} maxLength={HOMEWORK_DETAILS_MAX}
            onChange={(event) => change('details', event.target.value)} aria-invalid={Boolean(errorOf('details'))}
            aria-describedby={described('details', true)} />
          <div id="homework-details-help" className={calm.help}>{text.detailsHelp}</div>
          <div id="homework-details-error" className={calm.fieldError}>{errorOf('details')}</div>
        </div>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="homework-dueOn">{text.dueOn}</label>
          <input id="homework-dueOn" type="date" className={calm.input} value={values.dueOn}
            onChange={(event) => change('dueOn', event.target.value)} aria-invalid={Boolean(errorOf('dueOn'))} aria-describedby={described('dueOn')} />
          <div id="homework-dueOn-error" className={calm.fieldError}>{errorOf('dueOn')}</div>
        </div>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="homework-markingMinutes">{text.markingMinutes}</label>
          <input id="homework-markingMinutes" type="number" inputMode="numeric" min={MARKING_MIN_MINUTES} max={MARKING_MAX_MINUTES}
            className={calm.input} value={values.markingMinutes} onChange={(event) => change('markingMinutes', event.target.value)}
            aria-invalid={Boolean(errorOf('markingMinutes'))} aria-describedby={described('markingMinutes', true)} />
          <div id="homework-markingMinutes-help" className={calm.help}>{text.markingHelp}</div>
          <div id="homework-markingMinutes-error" className={calm.fieldError}>{errorOf('markingMinutes')}</div>
        </div>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="homework-markBy">{text.markBy}</label>
          <input id="homework-markBy" type="date" className={calm.input} value={values.markBy} min={values.dueOn || undefined}
            onChange={(event) => change('markBy', event.target.value)} aria-invalid={Boolean(errorOf('markBy'))}
            aria-describedby={described('markBy')} />
          <div id="homework-markBy-error" className={calm.fieldError}>{errorOf('markBy')}</div>
        </div>

        <HomeworkPreviewNotice text={text} request={deferredRequest} />

        <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={save.isPending}>
          {save.isPending ? text.submitting : text.submit}
        </button>
      </form>
    </section>
  );
}
