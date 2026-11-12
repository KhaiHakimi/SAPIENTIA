import type { HoursKind } from '../interfaces/hours.interface';

export interface HoursMessages {
  pageTitle: string;
  intro: string;
  privacy: string;
  loading: string;
  month: string;
  // Adding an entry
  addTitle: string;
  date: string;
  hours: string;
  minutes: string;
  timeHelp: string;
  kind: string;
  kinds: Record<HoursKind, string>;
  note: string;
  noteHelp: string;
  optional: string;
  add: string;
  adding: string;
  added: string;
  needTime: string;
  // The month
  monthTitle: (month: string) => string;
  total: (duration: string) => string;
  empty: string;
  columns: { date: string; time: string; kind: string; note: string; actions: string };
  remove: string;
  removeLabel: (day: string, duration: string) => string;
  // Sharing
  shareTitle: string;
  shareIntro: string;
  notShared: string;
  shared: (duration: string, when: string) => string;
  changedSince: (duration: string) => string;
  share: string;
  shareAgain: string;
  withdraw: string;
  working: string;
  fieldErrors: Record<string, string>;
}
