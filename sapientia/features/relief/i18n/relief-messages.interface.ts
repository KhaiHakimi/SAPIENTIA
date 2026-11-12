export interface ReliefMessages {
  pageTitle: string;
  introOwn: string;
  introAdmin: string;
  loading: string;
  // My own duties
  myTitle: string;
  myEmpty: string;
  columns: { date: string; time: string; what: string; forWhom: string };
  // Arranging (administrators)
  planTitle: string;
  planIntro: string;
  absentTeacher: string;
  chooseTeacher: string;
  date: string;
  periodsTitle: (name: string, day: string) => string;
  noPeriods: string;
  cannotArrange: string;
  notCovered: string;
  coveredBy: (name: string) => string;
  heldUntil: (when: string) => string;
  told: string;
  find: string;
  findLabel: (time: string) => string;
  hide: string;
  suggestionsNote: string;
  noOneFree: string;
  suggestionLine: (reliefCount: number, committed: string) => string;
  choose: (name: string) => string;
  choosing: string;
  cancel: string;
  cancelLabel: (name: string, time: string) => string;
  cancelling: string;
  fieldErrors: Record<string, string>;
}
