import type { StudentStatus } from '../interfaces/student.interface';

export interface StudentsMessages {
  title: string;
  intro: string;
  dataNote: string;
  listTitle: string;
  classFilter: string;
  allClasses: string;
  columns: { name: string; number: string; className: string; username: string; status: string };
  statuses: Record<StudentStatus, string>;
  slipNotUsed: string;
  empty: string;
  noClasses: string;
  loadMore: string;
  loading: string;

  addTitle: string;
  addIntro: string;
  addClass: string;
  chooseClass: string;
  addList: string;
  addListHelp: string;
  preview: (count: number) => string;
  add: string;
  adding: string;
  added: (count: number) => string;
  lineProblem: (line: number, problem: string) => string;

  manageButton: string;
  manage: (name: string) => string;
  close: string;
  editName: string;
  editNumber: string;
  editClass: string;
  save: string;
  saving: string;
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
  slipUsername: string;
  slipPassword: string;
  slipSteps: (address: string) => string;
  slipExpires: (date: string) => string;
  slipKeepSafe: string;

  /** Field reasons worded for this page; anything else falls back to the shared table. */
  fieldErrors: Record<string, string>;
}
