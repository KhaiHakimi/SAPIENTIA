import type { NotHeldReason } from '../interfaces/lesson.interface';

export interface LessonsMessages {
  pageTitle: string;
  intro: string;
  loading: string;
  date: string;
  dayTitle: (day: string) => string;
  notRecordable: string;
  noPeriods: string;
  // One period
  coveringFor: (name: string) => string;
  coveredBy: (name: string) => string;
  notStarted: string;
  notRecorded: string;
  recordedHeld: string;
  recordedNotHeld: (reason: string) => string;
  recordedBy: (name: string) => string;
  held: string;
  notHeld: string;
  heldLabel: (time: string) => string;
  notHeldLabel: (time: string) => string;
  reason: string;
  chooseReason: string;
  reasons: Record<NotHeldReason, string>;
  note: string;
  noteHelp: string;
  erph: string;
  erphHelp: string;
  erphOpen: string;
  saveErph: string;
  save: string;
  saving: string;
  saved: string;
  cancel: string;
  optional: string;
  fieldErrors: Record<string, string>;
}
