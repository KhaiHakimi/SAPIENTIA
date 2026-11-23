'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import { TIMETABLE_MESSAGES } from '@/features/timetable/i18n/timetable.messages';
import { fetchTimetableTeachers, TIMETABLE_TEACHERS_KEY } from '@/features/timetable/services/timetable.client';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDay, todayInZone } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { RELIEF_MESSAGES } from '../i18n/relief.messages';
import type { ReliefDuty } from '../interfaces/relief.interface';
import { fetchMyReliefDuties, fetchReliefDay, MY_RELIEF_KEY, reliefDayKey } from '../services/relief.client';
import styles from '../styles/Relief.module.css';
import { ReliefPeriod } from './ReliefPeriod';

/** Everyone: the classes they cover for a colleague, from today on. A duty still held is not there yet. */
function MyReliefDuties() {
  const text = useMessages(RELIEF_MESSAGES);
  const timetable = useMessages(TIMETABLE_MESSAGES);
  const { lang } = useLanguage();
  const duties = useQuery({ queryKey: MY_RELIEF_KEY, queryFn: fetchMyReliefDuties });

  return (
    <section className={calm.card} aria-labelledby="relief-mine-title">
      <h2 id="relief-mine-title">{text.myTitle}</h2>
      {duties.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : duties.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(duties.error, lang)}</div>
      ) : duties.data.length === 0 ? (
        <p className={calm.empty}>{text.myEmpty}</p>
      ) : (
        <div className={calm.tableWrap}>
          <table className={calm.table}>
            <thead>
              <tr>
                <th scope="col">{text.columns.date}</th>
                <th scope="col">{text.columns.time}</th>
                <th scope="col">{text.columns.what}</th>
                <th scope="col">{text.columns.forWhom}</th>
              </tr>
            </thead>
            <tbody>
              {duties.data.map((duty) => (
                <tr key={duty.id}>
                  <td>{formatDay(duty.onDate, lang, { weekday: true })}</td>
                  <td>{timetable.timeRange(duty.startTime, duty.endTime)}</td>
                  <td>{duty.class && duty.subject ? timetable.lesson(duty.class.name, duty.subject.name) : duty.label}</td>
                  <td>{duty.absentTeacher.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * The teacher chosen as away is also down to cover colleagues' classes that day. Nothing moves those by itself, so the
 * administrator is told which, to cancel and arrange again.
 */
function OwnDutiesWarning({ name, duties }: { name: string; duties: readonly ReliefDuty[] }) {
  const text = useMessages(RELIEF_MESSAGES);
  const timetable = useMessages(TIMETABLE_MESSAGES);
  return (
    <div className={`${calm.alert} ${calm.alertError}`} role="status">
      <p>{text.ownDutiesWarning(name)}</p>
      <ul>
        {duties.map((duty) => (
          <li key={duty.id}>
            {text.ownDutyLine(
              timetable.timeRange(duty.startTime, duty.endTime),
              duty.class && duty.subject ? timetable.lesson(duty.class.name, duty.subject.name) : (duty.label ?? ''),
              duty.absentTeacher.name,
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Administrators: choose who is away and when, then cover each of their periods. The suggestions are a short list to
 * choose from, never a ranking of the staff (plan Phase 2).
 */
function ReliefPlanner() {
  const text = useMessages(RELIEF_MESSAGES);
  const { lang } = useLanguage();
  const user = useStaffUser();
  const timetable = useMessages(TIMETABLE_MESSAGES);
  // Includes staff no longer active who still have periods: those periods need cover until they are taken off.
  const staff = useQuery({ queryKey: TIMETABLE_TEACHERS_KEY, queryFn: fetchTimetableTeachers });
  const [teacherId, setTeacherId] = useState('');
  const [onDate, setOnDate] = useState(() => todayInZone(user.timeZone));
  const ready = teacherId !== '' && onDate !== '';
  const day = useQuery({ queryKey: reliefDayKey(teacherId, onDate), queryFn: () => fetchReliefDay(teacherId, onDate), enabled: ready });

  return (
    <section className={calm.card} aria-labelledby="relief-plan-title">
      <h2 id="relief-plan-title">{text.planTitle}</h2>
      <p className={calm.muted}>{text.planIntro}</p>
      <div className={styles.filters}>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="relief-teacher">{text.absentTeacher}</label>
          <select id="relief-teacher" className={calm.select} value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
            <option value="">{text.chooseTeacher}</option>
            {(staff.data ?? []).map((person) => (
              <option key={person.id} value={person.id}>{timetable.teacherOption(person.name, person.status)}</option>
            ))}
          </select>
          {staff.isError && <div className={calm.fieldError} role="alert">{describeApiError(staff.error, lang)}</div>}
        </div>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="relief-date">{text.date}</label>
          <input id="relief-date" type="date" className={calm.input} value={onDate} onChange={(event) => setOnDate(event.target.value)} />
        </div>
      </div>

      {!ready ? null : day.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : day.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(day.error, lang)}</div>
      ) : (
        <>
          <h3>{text.periodsTitle(day.data.teacher.name, formatDay(day.data.onDate, lang, { weekday: true }))}</h3>
          {!day.data.canArrange && <p className={`${calm.alert} ${calm.alertInfo}`} role="status">{text.cannotArrange}</p>}
          {day.data.ownDuties.length > 0 && <OwnDutiesWarning name={day.data.teacher.name} duties={day.data.ownDuties} />}
          {day.data.periods.length === 0 ? (
            <p className={calm.empty}>{text.noPeriods}</p>
          ) : (
            <ul className={styles.periods}>
              {day.data.periods.map(({ slot, relief }) => (
                <ReliefPeriod key={slot.id} slot={slot} relief={relief} onDate={day.data.onDate} canArrange={day.data.canArrange} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** Relief (plan Phase 2, Sprint 8). Everyone sees the classes they cover; administrators also arrange relief. */
export function ReliefPage() {
  const text = useMessages(RELIEF_MESSAGES);
  const isAdmin = useStaffUser().role === 'admin';
  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.pageTitle}</h1>
          <p>{isAdmin ? text.introAdmin : text.introOwn}</p>
        </div>
      </div>
      <MyReliefDuties />
      {isAdmin && <ReliefPlanner />}
    </>
  );
}
