/** The guardian's own pages: choosing a password, then the read-only view of their children. */
export interface GuardianViewMessages {
  brand: string;
  switchLanguage: string;
  theme: string;
  signOut: string;

  chooseTitle: string;
  chooseIntro: (name: string) => string;
  currentPassword: string;
  currentHelp: string;
  newPassword: string;
  newHelp: string;
  confirm: string;
  show: string;
  hide: string;
  submit: string;
  submitting: string;

  hello: (name: string) => string;
  intro: string;
  sampleNote: string;
  loading: string;
  noChildren: string;
  childHeading: (name: string, className: string | null) => string;
  relationshipLine: (relationship: string) => string;

  homeworkTitle: string;
  homeworkEmpty: string;
  columns: { subject: string; title: string; teacher: string; due: string; handedIn: string };
  handedInYes: string;
  handedInNo: string;
  handInNote: string;

  weekTitle: string;
  weekPrevious: string;
  weekNext: string;
  weekRange: (from: string, to: string) => string;
  dayOff: string;
  noLessons: string;
  relief: string;

  refuseOpen: string;
  refuseTitle: (name: string) => string;
  refuseIntro: string;
  refuseReason: string;
  refuseConfirm: string;
  refused: string;
  cancel: string;

  /** Field reasons worded for these pages; anything else falls back to the shared table. */
  fieldErrors: Record<string, string>;
}
