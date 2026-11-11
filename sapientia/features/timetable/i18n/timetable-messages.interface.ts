import type { IsoWeekday } from '@/features/delivery/interfaces/working-calendar.interface';

export type SlotKind = 'lesson' | 'duty';

export interface TimetableMessages {
  pageTitle: string;
  introOwn: string;
  introAdmin: string;
  teacher: string;
  weekTitle: (name: string) => string;
  weekdays: Record<IsoWeekday, string>;
  columns: { day: string; time: string; what: string; actions: string };
  timeRange: (start: string, end: string) => string;
  lesson: (className: string, subjectName: string) => string;
  empty: string;
  emptyOwn: string;
  loading: string;
  addTitle: string;
  day: string;
  startTime: string;
  endTime: string;
  kind: string;
  kinds: Record<SlotKind, string>;
  class: string;
  subject: string;
  choose: string;
  noSchoolData: string;
  label: string;
  labelPlaceholder: string;
  add: string;
  adding: string;
  remove: string;
  removing: string;
  removeLabel: (day: string, start: string) => string;
  fieldErrors: Record<string, string>;
}
