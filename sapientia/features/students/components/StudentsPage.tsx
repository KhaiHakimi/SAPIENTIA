'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchSchoolData, schoolDataKey } from '@/features/school-data/services/school-data.client';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { StudentSlip } from '../interfaces/student.interface';
import { STUDENTS_MESSAGES } from '../i18n/students.messages';
import { fetchStudentsPage, studentsKey } from '../services/students.client';
import { AddStudentsForm } from './AddStudentsForm';
import { StudentRow } from './StudentRow';
import { StudentSlips } from './StudentSlips';

/** Administrators: the school's pupils by class, adding a class list, and the slips to print (plan Phase 4, Sprint 11). */
export function StudentsPage() {
  const text = useMessages(STUDENTS_MESSAGES);
  const { lang } = useLanguage();
  const user = useStaffUser();
  const [classId, setClassId] = useState('');
  const [slips, setSlips] = useState<StudentSlip[]>([]);
  const classes = useQuery({ queryKey: schoolDataKey('classes'), queryFn: () => fetchSchoolData('classes') });
  const students = useInfiniteQuery({
    queryKey: studentsKey(classId),
    queryFn: ({ pageParam }) => fetchStudentsPage(classId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const classList = classes.data ?? [];
  const rows = students.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
          <p className={calm.help}>{text.dataNote}</p>
        </div>
      </div>

      {slips.length > 0 && (
        <StudentSlips text={text} slips={slips} schoolName={user.schoolName} timeZone={user.timeZone} onDone={() => setSlips([])} />
      )}

      <div className={calm.grid2}>
        <section className={calm.card} aria-labelledby="students-title">
          <h2 id="students-title">{text.listTitle}</h2>
          <div className={calm.field}>
            <label className={calm.label} htmlFor="students-class">{text.classFilter}</label>
            <select id="students-class" className={calm.select} value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">{text.allClasses}</option>
              {classList.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          {students.isPending ? (
            <p className={calm.loading} role="status">{text.loading}</p>
          ) : students.isError ? (
            <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(students.error, lang)}</div>
          ) : rows.length === 0 ? (
            <p className={calm.empty}>{text.empty}</p>
          ) : (
            <div className={calm.tableWrap}>
              <table className={calm.table}>
                <thead>
                  <tr>
                    <th scope="col">{text.columns.name}</th>
                    <th scope="col">{text.columns.className}</th>
                    <th scope="col">{text.columns.username}</th>
                    <th scope="col">{text.columns.status}</th>
                    <th scope="col"><span className="sr-only">{text.manageButton}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((student) => (
                    <StudentRow key={student.id} text={text} student={student} classes={classList} onSlip={(slip) => setSlips([slip])} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {students.hasNextPage && (
            <p>
              <button type="button" className={calm.button} onClick={() => students.fetchNextPage()} disabled={students.isFetchingNextPage}>
                {students.isFetchingNextPage ? text.loading : text.loadMore}
              </button>
            </p>
          )}
        </section>
        {classes.isSuccess && classList.length === 0 ? (
          <section className={calm.card} aria-labelledby="add-students-title">
            <h2 id="add-students-title">{text.addTitle}</h2>
            <p className={calm.empty}>{text.noClasses}</p>
          </section>
        ) : (
          <AddStudentsForm text={text} classes={classList} onAdded={(result) => setSlips(result.slips)} />
        )}
      </div>
    </>
  );
}
