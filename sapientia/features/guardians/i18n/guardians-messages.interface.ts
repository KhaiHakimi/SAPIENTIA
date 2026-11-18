import type { StudentStatus } from '@/features/students/interfaces/student.interface';
import type { LinkStatus } from '../interfaces/guardian.interface';

/** The administrator's Guardians page. */
export interface GuardiansMessages {
  title: string;
  intro: string;
  dataNote: string;
  listTitle: string;
  columns: { name: string; username: string; children: string; status: string };
  statuses: Record<StudentStatus, string>;
  linkStatuses: Record<LinkStatus, string>;
  endedBecause: (reason: string) => string;
  slipNotUsed: string;
  empty: string;
  loadMore: string;
  loading: string;

  addTitle: string;
  addIntro: string;
  name: string;
  className: string;
  chooseClass: string;
  pupil: string;
  choosePupil: string;
  noPupils: string;
  relationship: string;
  add: string;
  adding: string;
  added: string;

  manageButton: string;
  manage: (name: string) => string;
  close: string;
  addLinkTitle: string;
  addLink: string;
  removeLink: (childName: string) => string;
  removeReason: string;
  confirmRemoveLink: string;
  saved: string;
  newSlip: string;
  disable: string;
  enable: string;
  remove: string;
  confirmRemove: (name: string) => string;
  cancel: string;

  slipsTitle: string;
  slipsIntro: string;
  print: string;
  doneWithSlips: string;
  slipHeading: string;
  slipChildren: (names: string) => string;
  slipUsername: string;
  slipPassword: string;
  slipSteps: (address: string) => string;
  slipExpires: (date: string) => string;
  slipKeepSafe: string;

  summaryLink: string;
  summaryLinkLabel: (name: string) => string;
  summaryTitle: string;
  summaryIntro: string;
  summaryBack: string;
  summaryThisWeek: string;
  summaryNextWeek: string;
  summaryPrint: string;
  summaryHeading: (guardianName: string) => string;
  summaryPrinted: (date: string) => string;
  summaryChild: (name: string, className: string | null) => string;
  summaryHomeworkTitle: (from: string, to: string) => string;
  summaryHomeworkEmpty: string;
  summaryColumns: { due: string; subject: string; title: string; teacher: string };
  summaryWeekTitle: (from: string, to: string) => string;
  summaryDayOff: string;
  summaryNoLessons: string;
  summaryRelief: string;
  summaryNoChildren: string;
  summaryFooter: string;

  /** Field reasons worded for this page; anything else falls back to the shared table. */
  fieldErrors: Record<string, string>;
}
