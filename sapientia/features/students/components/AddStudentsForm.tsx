'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import type { SchoolDataItem } from '@/features/school-data/interfaces/school-data.interface';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage } from '@/shared/i18n/useLanguage';
import type { AddStudentsResult } from '../interfaces/student.interface';
import type { StudentsMessages } from '../i18n/students-messages.interface';
import { parseClassList } from '../services/class-list.service';
import { addStudents, STUDENTS_ROOT_KEY } from '../services/students.client';
import styles from '../styles/Students.module.css';

interface AddStudentsFormProps {
  text: StudentsMessages;
  classes: readonly SchoolDataItem[];
  onAdded: (result: AddStudentsResult) => void;
}

/** Paste a class list, check the preview, add everyone at once (story S11-1). Problems are shown against their line. */
export function AddStudentsForm({ text, classes, onAdded }: AddStudentsFormProps) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState('');
  const [list, setList] = useState('');
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const pupils = useMemo(() => parseClassList(list), [list]);

  const add = useMutation({
    mutationFn: addStudents,
    onSuccess: (result) => {
      setAddedCount(result.students.length);
      setList('');
      onAdded(result);
      void queryClient.invalidateQueries({ queryKey: STUDENTS_ROOT_KEY });
    },
  });
  const fields = add.error instanceof ApiError ? add.error.fields : {};
  const fieldText = (code: string | undefined) => (code ? (text.fieldErrors[code] ?? describeFieldError(code, lang)) : '');
  const rowProblem = (index: number) => fields[`students.${index}.name`] ?? fields[`students.${index}.schoolNumber`];
  const listProblem = fields.students;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddedCount(null);
    add.mutate({ classId, students: pupils.map(({ name, schoolNumber }) => ({ name, schoolNumber })) });
  };

  return (
    <section className={calm.card} aria-labelledby="add-students-title">
      <h2 id="add-students-title">{text.addTitle}</h2>
      <p className={calm.muted}>{text.addIntro}</p>

      {add.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(add.error, lang)}</div>}
      {addedCount !== null && <div className={`${calm.alert} ${calm.alertOk}`} role="status">{text.added(addedCount)}</div>}

      <form onSubmit={onSubmit} noValidate>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="add-students-class">{text.addClass}</label>
          <select id="add-students-class" className={calm.select} value={classId} onChange={(event) => setClassId(event.target.value)}
            aria-invalid={Boolean(fields.classId)} aria-describedby="add-students-class-error">
            <option value="">{text.chooseClass}</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <div id="add-students-class-error" className={calm.fieldError}>{fieldText(fields.classId)}</div>
        </div>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="add-students-list">{text.addList}</label>
          <textarea id="add-students-list" className={calm.textarea} rows={8} value={list} spellCheck={false}
            onChange={(event) => setList(event.target.value)} aria-invalid={Boolean(listProblem)}
            aria-describedby="add-students-list-help add-students-list-error" />
          <div id="add-students-list-help" className={calm.help}>{text.addListHelp}</div>
          <div id="add-students-list-error" className={calm.fieldError}>{fieldText(listProblem)}</div>
        </div>

        {pupils.length > 0 && (
          <div className={styles.preview}>
            <p className={calm.help}>{text.preview(pupils.length)}</p>
            <ol className={styles.previewList}>
              {pupils.map((pupil, index) => {
                const problem = rowProblem(index);
                return (
                  <li key={pupil.line} className={problem ? styles.previewProblem : undefined}>
                    <span>{pupil.name || '—'}</span>
                    {pupil.schoolNumber && <span className={calm.code}>{pupil.schoolNumber}</span>}
                    {problem && <span className={calm.fieldError}>{text.lineProblem(pupil.line, fieldText(problem))}</span>}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={add.isPending}>
          {add.isPending ? text.adding : text.add}
        </button>
      </form>
    </section>
  );
}
