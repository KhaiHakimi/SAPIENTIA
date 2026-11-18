import type { MEETING_DECLINE_REASONS, MEETING_TIMES_OF_DAY, MEETING_TOPICS } from '../constants/meetings.constants';

export type MeetingTopic = (typeof MEETING_TOPICS)[number];
export type MeetingTimeOfDay = (typeof MEETING_TIMES_OF_DAY)[number];
export type MeetingDeclineReason = (typeof MEETING_DECLINE_REASONS)[number];
export type MeetingStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'cancelled';

/** A teacher of the child's class whom the guardian may ask, with the subjects they teach that class. */
export interface MeetingTeacher {
  id: string;
  name: string;
  subjects: string[];
}

/** One request as its guardian sees it. deliverAt later than now means it is still waiting for working hours. */
export interface GuardianMeeting {
  id: string;
  teacherName: string;
  topic: MeetingTopic;
  timeOfDay: MeetingTimeOfDay;
  status: MeetingStatus;
  createdAt: string;
  deliverAt: string;
  meetingAt: string | null;
  declineReason: MeetingDeclineReason | null;
}

/** GET /api/guardian/children/:linkId/meetings */
export interface ChildMeetings {
  teachers: MeetingTeacher[];
  requests: GuardianMeeting[];
}

/** POST /api/guardian/children/:linkId/meetings */
export interface RequestMeetingRequest {
  teacherId: string;
  topic: MeetingTopic;
  timeOfDay: MeetingTimeOfDay;
}

/** One request as its teacher sees it: the guardian's name only, never their username, relationship or other children. */
export interface TeacherMeeting {
  id: string;
  guardianName: string;
  pupilName: string;
  className: string | null;
  topic: MeetingTopic;
  timeOfDay: MeetingTimeOfDay;
  status: MeetingStatus;
  receivedAt: string;
  meetingAt: string | null;
  declineReason: MeetingDeclineReason | null;
}

/** GET /api/meetings */
export interface TeacherMeetings {
  items: TeacherMeeting[];
  timeZone: string;
}

/** PATCH /api/meetings/:id. The date and time are school-local and must fall inside working hours. */
export type AnswerMeetingRequest =
  | { answer: 'accept'; date: string; time: string }
  | { answer: 'decline'; reason: MeetingDeclineReason };
