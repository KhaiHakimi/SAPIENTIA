'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchSchoolData, schoolDataKey } from '@/features/school-data/services/school-data.client';
import { fetchStudentsPage, STUDENTS_ROOT_KEY } from '@/features/students/services/students.client';
import calm from '@/shared/calm/Calm.module.css';
import { PAGE_MAX_CLIENT } from '../constants/guardian-ui.constants';
import type { GuardiansMessages } from '../i18n/guardians-messages.interface';

interface PupilPickerProps {
  text: GuardiansMessages;
  /** Prefix for the two controls' ids, so two pickers on one page do not clash. */
  idPrefix: string;
  studentId: string;
  onChange: (studentId: string) => void;
  error?: string;
}

/** Class first, then a pupil of that class: the administrator never types a pupil's name to link a guardian. */
export function PupilPicker({ text, idPrefix, studentId, onChange, error }: PupilPickerProps) {
  const [classId, setClassId] = useState('');
  const classes = useQuery({ queryKey: schoolDataKey('classes'), queryFn: () => fetchSchoolData('classes') });
  const pupils = useQuery({
    queryKey: [...STUDENTS_ROOT_KEY, 'picker', classId],
    queryFn: () => fetchStudentsPage(classId, null, PAGE_MAX_CLIENT),
    enabled: classId !== '',
  });

  return (
    <>
      <div className={calm.field}>
        <label className={calm.label} htmlFor={`${idPrefix}-class`}>{text.className}</label>
        <select id={`${idPrefix}-class`} className={calm.select} value={classId} onChange={(event) => {
          setClassId(event.target.value);
          onChange('');
        }}>
          <option value="">{text.chooseClass}</option>
          {(classes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <div className={calm.field}>
        <label className={calm.label} htmlFor={`${idPrefix}-pupil`}>{text.pupil}</label>
        <select id={`${idPrefix}-pupil`} className={calm.select} value={studentId} disabled={!classId} onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)} aria-describedby={`${idPrefix}-pupil-error`}>
          <option value="">{classId && pupils.data?.items.length === 0 ? text.noPupils : text.choosePupil}</option>
          {(pupils.data?.items ?? []).map((pupil) => <option key={pupil.id} value={pupil.id}>{pupil.name}</option>)}
        </select>
        <div id={`${idPrefix}-pupil-error`} className={calm.fieldError}>{error ?? ''}</div>
      </div>
    </>
  );
}
