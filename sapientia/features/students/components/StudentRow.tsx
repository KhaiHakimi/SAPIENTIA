'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { SchoolDataItem } from '@/features/school-data/interfaces/school-data.interface';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage } from '@/shared/i18n/useLanguage';
import type { SchoolStudent, StudentSlip, UpdateStudentRequest } from '../interfaces/student.interface';
import type { StudentsMessages } from '../i18n/students-messages.interface';
import { removeStudent, resetStudentPassword, STUDENTS_ROOT_KEY, updateStudent } from '../services/students.client';
import styles from '../styles/Students.module.css';

const STATUS_BADGE = { active: calm.badgeOk, disabled: calm.badgeDanger } as const;

interface StudentRowProps {
  text: StudentsMessages;
  student: SchoolStudent;
  classes: readonly SchoolDataItem[];
  onSlip: (slip: StudentSlip) => void;
}

/** One pupil in the list, and under it (when opened) the panel to correct details, print a new slip, disable or remove. */
export function StudentRow({ text, student, classes, onSlip }: StudentRowProps) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [name, setName] = useState(student.name);
  const [schoolNumber, setSchoolNumber] = useState(student.schoolNumber ?? '');
  const [classId, setClassId] = useState(student.classId);
  const refresh = () => queryClient.invalidateQueries({ queryKey: STUDENTS_ROOT_KEY });

  const save = useMutation({ mutationFn: (input: UpdateStudentRequest) => updateStudent(student.id, input), onSuccess: refresh });
  const slip = useMutation({ mutationFn: () => resetStudentPassword(student.id), onSuccess: (created) => {
    onSlip(created);
    void refresh();
  } });
  const remove = useMutation({ mutationFn: () => removeStudent(student.id), onSuccess: refresh });
  const failed = [save, slip, remove].find((mutation) => mutation.isError);
  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const fieldText = (code: string | undefined) => (code ? (text.fieldErrors[code] ?? describeFieldError(code, lang)) : '');
  const panelId = `student-${student.id}-panel`;
  const field = (key: string) => `student-${student.id}-${key}`;

  const onSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate({ name, schoolNumber: schoolNumber.trim() || null, classId });
  };

  return (
    <>
      <tr>
        <td>
          {student.name}
          {student.schoolNumber && <div className={`${calm.muted} ${calm.code}`}>{student.schoolNumber}</div>}
        </td>
        <td>{student.className}</td>
        <td className={calm.code}>{student.username}</td>
        <td>
          <span className={`${calm.badge} ${STATUS_BADGE[student.status]}`}>{text.statuses[student.status]}</span>
          {!student.hasOwnPassword && <div className={calm.help}>{text.slipNotUsed}</div>}
        </td>
        <td>
          <button type="button" className={`${calm.button} ${calm.small}`} aria-expanded={open} aria-controls={panelId}
            aria-label={text.manage(student.name)} onClick={() => setOpen((shown) => !shown)}>
            {open ? text.close : text.manageButton}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} id={panelId} className={styles.panel}>
            {failed && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(failed.error, lang)}</div>}
            {save.isSuccess && <div className={`${calm.alert} ${calm.alertOk}`} role="status">{text.saved}</div>}
            <form className={styles.panelForm} onSubmit={onSave} noValidate>
              <div className={calm.field}>
                <label className={calm.label} htmlFor={field('name')}>{text.editName}</label>
                <input id={field('name')} className={calm.input} value={name} onChange={(event) => setName(event.target.value)}
                  autoComplete="off" aria-invalid={Boolean(fields.name)} aria-describedby={field('name-error')} />
                <div id={field('name-error')} className={calm.fieldError}>{fieldText(fields.name)}</div>
              </div>
              <div className={calm.field}>
                <label className={calm.label} htmlFor={field('number')}>{text.editNumber}</label>
                <input id={field('number')} className={calm.input} value={schoolNumber} onChange={(event) => setSchoolNumber(event.target.value)}
                  autoComplete="off" aria-invalid={Boolean(fields.schoolNumber)} aria-describedby={field('number-error')} />
                <div id={field('number-error')} className={calm.fieldError}>{fieldText(fields.schoolNumber)}</div>
              </div>
              <div className={calm.field}>
                <label className={calm.label} htmlFor={field('class')}>{text.editClass}</label>
                <select id={field('class')} className={calm.select} value={classId} onChange={(event) => setClassId(event.target.value)}
                  aria-invalid={Boolean(fields.classId)} aria-describedby={field('class-error')}>
                  {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <div id={field('class-error')} className={calm.fieldError}>{fieldText(fields.classId)}</div>
              </div>
              <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={save.isPending}>
                {save.isPending ? text.saving : text.save}
              </button>
            </form>
            <div className={calm.row}>
              <button type="button" className={calm.button} disabled={slip.isPending} onClick={() => slip.mutate()}>{text.newSlip}</button>
              <button type="button" className={calm.button} disabled={save.isPending}
                onClick={() => save.mutate({ status: student.status === 'active' ? 'disabled' : 'active' })}>
                {student.status === 'active' ? text.disable : text.enable}
              </button>
              {!confirmingRemove && (
                <button type="button" className={`${calm.button} ${calm.danger}`} onClick={() => setConfirmingRemove(true)}>{text.remove}</button>
              )}
            </div>
            {confirmingRemove && (
              <div className={`${calm.alert} ${calm.alertInfo}`} role="alert">
                <p>{text.confirmRemove(student.name)}</p>
                <div className={calm.row}>
                  <button type="button" className={`${calm.button} ${calm.danger}`} disabled={remove.isPending} onClick={() => remove.mutate()}>
                    {text.remove}
                  </button>
                  <button type="button" className={calm.button} onClick={() => setConfirmingRemove(false)}>{text.cancel}</button>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
