import { apiFetch } from '@/shared/api/api-client';
import type {
  AnswerMeetingRequest,
  ChildMeetings,
  GuardianMeeting,
  RequestMeetingRequest,
  TeacherMeeting,
  TeacherMeetings,
} from '../interfaces/meeting.interface';

/** Meeting requests: the guardian's side (under each child) and the teacher's page. */

export const childMeetingsKey = (linkId: string) => ['guardian', 'meetings', linkId] as const;
export const MY_MEETINGS_KEY = ['meetings'] as const;

const childPath = (linkId: string) => `/api/guardian/children/${encodeURIComponent(linkId)}/meetings`;

export function fetchChildMeetings(linkId: string): Promise<ChildMeetings> {
  return apiFetch(childPath(linkId));
}

export function requestMeeting(linkId: string, input: RequestMeetingRequest): Promise<GuardianMeeting> {
  return apiFetch(childPath(linkId), { method: 'POST', body: input });
}

export function withdrawMeeting(meetingId: string): Promise<void> {
  return apiFetch(`/api/guardian/meetings/${encodeURIComponent(meetingId)}/withdrawal`, { method: 'POST' });
}

export function fetchMyMeetings(): Promise<TeacherMeetings> {
  return apiFetch('/api/meetings');
}

export function answerMeeting(meetingId: string, input: AnswerMeetingRequest): Promise<TeacherMeeting> {
  return apiFetch(`/api/meetings/${encodeURIComponent(meetingId)}`, { method: 'PATCH', body: input });
}
