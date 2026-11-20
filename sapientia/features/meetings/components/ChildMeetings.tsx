'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDate } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { MEETING_PENDING_MAX, MEETING_TIMES_OF_DAY, MEETING_TOPICS } from '../constants/meetings.constants';
import { MEETINGS_MESSAGES } from '../i18n/meetings.messages';
import type { GuardianMeeting, MeetingTimeOfDay, MeetingTopic } from '../interfaces/meeting.interface';
import { childMeetingsKey, fetchChildMeetings, requestMeeting, withdrawMeeting } from '../services/meetings.client';
import styles from '../styles/Meetings.module.css';

const STATUS_BADGE = { pending: calm.badgeAccent, accepted: calm.badgeOk, declined: calm.badgeDanger, withdrawn: '', cancelled: '' } as const;

interface ChildMeetingsProps {
  linkId: string;
  timeZone: string;
}

/**
 * Under each child on the guardian's page (plan Phase 4, Sprint 13 part 2): ask one of the class's teachers for a meeting,
 * from fixed lists only, and see the answers. A request sent outside working hours shows when it will reach the teacher.
 */
export function ChildMeetings({ linkId, timeZone }: ChildMeetingsProps) {
  const text = useMessages(MEETINGS_MESSAGES);
  const { lang } = useLanguage();
  const meetings = useQuery({ queryKey: childMeetingsKey(linkId), queryFn: () => fetchChildMeetings(linkId) });

  if (meetings.isPending) return <p className={calm.loading} role="status">{text.loading}</p>;
  if (meetings.isError) return <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(meetings.error, lang)}</div>;
  const { teachers, requests } = meetings.data;

  return (
    <>
      <p className={calm.help}>{text.guardianIntro}</p>
      {requests.length === 0 ? (
        <p className={calm.empty}>{text.noRequests}</p>
      ) : (
        <ul className={styles.requests}>
          {requests.map((request) => <RequestItem key={request.id} linkId={linkId} request={request} timeZone={timeZone} />)}
        </ul>
      )}
      {teachers.length === 0
        ? <p className={calm.muted}>{text.noTeachers}</p>
        : <RequestForm linkId={linkId} teachers={teachers} timeZone={timeZone} />}
    </>
  );
}

function RequestItem({ linkId, request, timeZone }: { linkId: string; request: GuardianMeeting; timeZone: string }) {
  const text = useMessages(MEETINGS_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  // Read once: whether the request is still held for working hours only needs to be right when the list loads.
  const [loadedAt] = useState(() => Date.now());
  const withdraw = useMutation({
    mutationFn: () => withdrawMeeting(request.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: childMeetingsKey(linkId) }),
  });
  const when = (iso: string) => formatDate(iso, lang, { withTime: true, timeZone });
  const held = request.status === 'pending' && new Date(request.deliverAt).getTime() > loadedAt;

  return (
    <li className={styles.request}>
      <div className={calm.spread}>
        <strong>{text.requestLine(request.teacherName, text.topics[request.topic])}</strong>
        <span className={`${calm.badge} ${STATUS_BADGE[request.status]}`}>{text.statuses[request.status]}</span>
      </div>
      <div className={calm.help}>{text.timesOfDay[request.timeOfDay]}</div>
      {held && <div className={calm.help}>{text.heldUntil(when(request.deliverAt))}</div>}
      {request.meetingAt && <div>{text.meetingOn(when(request.meetingAt))}</div>}
      {request.declineReason && <div>{text.declinedBecause(text.declineReasons[request.declineReason])}</div>}
      {request.status === 'pending' && (
        <button type="button" className={`${calm.button} ${calm.small}`} disabled={withdraw.isPending} onClick={() => withdraw.mutate()}>
          {text.withdraw}
        </button>
      )}
      {withdraw.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(withdraw.error, lang)}</div>}
    </li>
  );
}

interface RequestFormProps {
  linkId: string;
  teachers: { id: string; name: string; subjects: string[] }[];
  timeZone: string;
}

function RequestForm({ linkId, teachers, timeZone }: RequestFormProps) {
  const text = useMessages(MEETINGS_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [teacherId, setTeacherId] = useState('');
  const [topic, setTopic] = useState<MeetingTopic>('homework');
  const [timeOfDay, setTimeOfDay] = useState<MeetingTimeOfDay>('any');
  const send = useMutation({
    mutationFn: () => requestMeeting(linkId, { teacherId, topic, timeOfDay }),
    onSuccess: async () => {
      setTeacherId('');
      await queryClient.invalidateQueries({ queryKey: childMeetingsKey(linkId) });
    },
  });
  const fields = send.error instanceof ApiError ? send.error.fields : {};
  const fieldText = (code: string | undefined) => (code ? (text.fieldErrors[code] ?? describeFieldError(code, lang)) : undefined);
  const teacherError = fieldText(fields.teacherId);
  const otherFailure = send.isError && !fields.teacherId;
  const id = (name: string) => `meeting-${linkId}-${name}`;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send.mutate();
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <fieldset className={calm.fieldset}>
        <legend>{text.guardianTitle}</legend>
        <div className={styles.formGrid}>
          <div className={calm.field}>
            <label className={calm.label} htmlFor={id('teacher')}>{text.teacher}</label>
            <select id={id('teacher')} className={calm.select} value={teacherId} onChange={(event) => setTeacherId(event.target.value)}
              aria-invalid={teacherError ? true : undefined} aria-describedby={teacherError ? id('teacher-error') : undefined}>
              <option value="">{text.chooseTeacher}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{text.teacherOption(teacher.name, teacher.subjects)}</option>
              ))}
            </select>
            {teacherError && <p id={id('teacher-error')} className={calm.fieldError}>{teacherError}</p>}
          </div>
          <div className={calm.field}>
            <label className={calm.label} htmlFor={id('topic')}>{text.topic}</label>
            <select id={id('topic')} className={calm.select} value={topic} onChange={(event) => setTopic(event.target.value as MeetingTopic)}>
              {MEETING_TOPICS.map((code) => <option key={code} value={code}>{text.topics[code]}</option>)}
            </select>
          </div>
          <div className={calm.field}>
            <label className={calm.label} htmlFor={id('time')}>{text.timeOfDay}</label>
            <select id={id('time')} className={calm.select} value={timeOfDay}
              onChange={(event) => setTimeOfDay(event.target.value as MeetingTimeOfDay)}>
              {MEETING_TIMES_OF_DAY.map((code) => <option key={code} value={code}>{text.timesOfDay[code]}</option>)}
            </select>
          </div>
        </div>
        <p className={calm.help}>{text.pendingLimit(MEETING_PENDING_MAX)}</p>
        <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={send.isPending}>{send.isPending ? text.sending : text.send}</button>
        {send.isSuccess && (
          <div className={`${calm.alert} ${calm.alertOk}`} role="status">
            {text.sent} {new Date(send.data.deliverAt).getTime() > new Date(send.data.createdAt).getTime()
              && text.heldUntil(formatDate(send.data.deliverAt, lang, { withTime: true, timeZone }))}
          </div>
        )}
        {otherFailure && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(send.error, lang)}</div>}
      </fieldset>
    </form>
  );
}
