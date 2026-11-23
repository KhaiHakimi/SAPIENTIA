'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { TimetableMessages } from '../i18n/timetable-messages.interface';
import { TIMETABLE_MESSAGES } from '../i18n/timetable.messages';
import type { TimetableSlot } from '../interfaces/timetable.interface';
import {
  fetchTimetable, fetchTimetableTeachers, removeTimetableSlot, TIMETABLE_KEY, TIMETABLE_TEACHERS_KEY, timetableKey,
} from '../services/timetable.client';
import { AddSlotForm } from './AddSlotForm';

/** The server names why a period cannot go (relief still to come); its reason is what the administrator needs to read. */
function describeSlotError(error: unknown, text: TimetableMessages, lang: Lang): string {
  const reason = error instanceof ApiError ? Object.values(error.fields)[0] : undefined;
  return (reason && text.fieldErrors[reason]) || describeApiError(error, lang);
}

function RemoveSlotButton({ slot, text }: { slot: TimetableSlot; text: TimetableMessages }) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => removeTimetableSlot(slot.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIMETABLE_KEY }),
  });
  return (
    <>
      <button type="button" className={`${calm.button} ${calm.small} ${calm.danger}`}
        aria-label={text.removeLabel(text.weekdays[slot.weekday], slot.startTime)} disabled={remove.isPending}
        onClick={() => remove.mutate()}>
        {remove.isPending ? text.removing : text.remove}
      </button>
      {remove.isError && <div className={calm.fieldError} role="alert">{describeSlotError(remove.error, text, lang)}</div>}
    </>
  );
}

/**
 * The weekly timetable (plan Phase 2). Everyone sees their own week; administrators choose a teacher and add or remove
 * periods. The API refuses a colleague's week to anyone else, so this page never offers the chooser to them.
 */
export function TimetablePage() {
  const text = useMessages(TIMETABLE_MESSAGES);
  const { lang } = useLanguage();
  const user = useStaffUser();
  const isAdmin = user.role === 'admin';
  const staff = useQuery({ queryKey: TIMETABLE_TEACHERS_KEY, queryFn: fetchTimetableTeachers, enabled: isAdmin });
  const [chosenId, setChosenId] = useState<string | null>(null);
  const teacherId = isAdmin ? chosenId : null;
  const timetable = useQuery({ queryKey: timetableKey(teacherId), queryFn: () => fetchTimetable(teacherId) });
  // Someone no longer active keeps their periods until removed, but gets no new ones (the server refuses them too).
  const canAdd = (timetable.data?.teacher.status ?? 'active') === 'active';

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.pageTitle}</h1>
          <p>{isAdmin ? text.introAdmin : text.introOwn}</p>
        </div>
      </div>

      {isAdmin && (
        <div className={calm.field}>
          <label className={calm.label} htmlFor="timetable-teacher">{text.teacher}</label>
          <select id="timetable-teacher" className={calm.select} value={chosenId ?? user.id} onChange={(event) => setChosenId(event.target.value)}>
            {/* Until the directory loads, the administrator's own name keeps the control from being empty. */}
            {(staff.data ?? [{ id: user.id, name: user.name, status: 'active' as const }]).map((person) => (
              <option key={person.id} value={person.id}>{text.teacherOption(person.name, person.status)}</option>
            ))}
          </select>
          {staff.isError && <div className={calm.fieldError} role="alert">{describeApiError(staff.error, lang)}</div>}
        </div>
      )}

      <div className={calm.grid2}>
        <section className={calm.card} aria-labelledby="timetable-week-title">
          <h2 id="timetable-week-title">{timetable.data ? text.weekTitle(timetable.data.teacher.name) : text.pageTitle}</h2>
          {timetable.isPending ? (
            <p className={calm.loading} role="status">{text.loading}</p>
          ) : timetable.isError ? (
            <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(timetable.error, lang)}</div>
          ) : timetable.data.slots.length === 0 ? (
            <p className={calm.empty}>{isAdmin ? text.empty : text.emptyOwn}</p>
          ) : (
            <div className={calm.tableWrap}>
              <table className={calm.table}>
                <thead>
                  <tr>
                    <th scope="col">{text.columns.day}</th>
                    <th scope="col">{text.columns.time}</th>
                    <th scope="col">{text.columns.what}</th>
                    {isAdmin && <th scope="col"><span className="sr-only">{text.columns.actions}</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {timetable.data.slots.map((slot) => (
                    <tr key={slot.id}>
                      <td>{text.weekdays[slot.weekday]}</td>
                      <td>{text.timeRange(slot.startTime, slot.endTime)}</td>
                      <td>{slot.class && slot.subject ? text.lesson(slot.class.name, slot.subject.name) : slot.label}</td>
                      {isAdmin && <td><RemoveSlotButton slot={slot} text={text} /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {isAdmin && canAdd && <AddSlotForm teacherId={chosenId ?? user.id} text={text} />}
        {isAdmin && !canAdd && <p className={`${calm.alert} ${calm.alertInfo}`} role="status">{text.inactiveNote}</p>}
      </div>
    </>
  );
}
