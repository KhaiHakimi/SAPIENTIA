'use client';

import calm from '@/shared/calm/Calm.module.css';
import { useMessages } from '@/shared/i18n/useLanguage';
import { SCHOOL_DATA_KINDS } from '../constants/school-data.constants';
import { SCHOOL_DATA_MESSAGES } from '../i18n/school-data.messages';
import { SchoolDataList } from './SchoolDataList';
import { TaskTypeFeedbackCard } from './TaskTypeFeedbackCard';

/** Administrators: the school's subjects, classes and task types (plan Phase 2), which the timetable and capacity check use. */
export function SchoolDataPage() {
  const text = useMessages(SCHOOL_DATA_MESSAGES);
  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.pageTitle}</h1>
          <p>{text.pageIntro}</p>
        </div>
      </div>
      <div className={calm.grid2}>
        {SCHOOL_DATA_KINDS.map((kind) => <SchoolDataList key={kind} kind={kind} text={text} />)}
      </div>
      <TaskTypeFeedbackCard text={text} />
    </>
  );
}
