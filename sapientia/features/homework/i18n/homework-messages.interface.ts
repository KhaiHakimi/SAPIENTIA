export interface HomeworkMessages {
  title: string;
  intro: string;
  noLessons: string;

  setTitle: string;
  lesson: string;
  chooseLesson: string;
  lessonName: (className: string, subjectName: string) => string;
  homeworkTitle: string;
  details: string;
  detailsHelp: string;
  dueOn: string;
  markingMinutes: string;
  markingHelp: string;
  markBy: string;
  submit: string;
  submitting: string;
  saved: string;
  savedFlagged: string;

  checking: string;
  checkFailed: string;
  weekTitle: string;
  weekEmpty: string;
  loadWarning: (sameDay: number) => string;
  loadOk: (sameDay: number) => string;
  markingFits: (free: string) => string;
  markingShort: (needed: string, free: string) => string;
  markingEarliest: (day: string) => string;

  listTitle: string;
  empty: string;
  loading: string;
  due: (day: string) => string;
  flagged: string;
  marking: (minutes: string, day: string) => string;
  markedBadge: string;
  handedIn: (count: number, total: number) => string;
  markDone: string;
  markUndo: string;
  handInsButton: (title: string) => string;
  hideHandIns: string;
  remove: string;
  removeConfirm: string;
  removeCancel: string;

  handInsTitle: string;
  handInsHelp: string;
  handInsEmpty: string;

  fieldErrors: Record<string, string>;
}
