import type { MeetingDeclineReason, MeetingStatus, MeetingTimeOfDay, MeetingTopic } from '../interfaces/meeting.interface';

/** Meeting requests: the fixed lists, the guardian's section under each child, and the teacher's page. */
export interface MeetingsMessages {
  topics: Record<MeetingTopic, string>;
  timesOfDay: Record<MeetingTimeOfDay, string>;
  declineReasons: Record<MeetingDeclineReason, string>;
  statuses: Record<MeetingStatus, string>;
  loading: string;

  // The guardian, under each child.
  guardianTitle: string;
  guardianIntro: string;
  noTeachers: string;
  teacher: string;
  chooseTeacher: string;
  teacherOption: (name: string, subjects: string[]) => string;
  topic: string;
  timeOfDay: string;
  send: string;
  sending: string;
  sent: string;
  heldUntil: (when: string) => string;
  noRequests: string;
  requestLine: (teacher: string, topic: string) => string;
  meetingOn: (when: string) => string;
  declinedBecause: (reason: string) => string;
  withdraw: string;
  pendingLimit: (max: number) => string;

  // The teacher's page.
  title: string;
  intro: string;
  privacyNote: string;
  empty: string;
  columns: { received: string; guardian: string; pupil: string; topic: string; timeOfDay: string; status: string };
  answer: (guardianName: string) => string;
  answerButton: string;
  close: string;
  acceptTitle: string;
  date: string;
  time: string;
  timeHelp: string;
  accept: string;
  declineTitle: string;
  declineReason: string;
  decline: string;

  /** Field reasons worded for these screens; anything else falls back to the shared table. */
  fieldErrors: Record<string, string>;
}
