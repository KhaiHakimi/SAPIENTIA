export interface ReportsMessages {
  // The page
  pageTitle: string;
  intro: string;
  month: string;
  loading: string;
  downloads: string;
  downloadPdf: string;
  downloadXlsx: string;
  // The report itself (page, PDF and Excel)
  reportTitle: (month: string) => string;
  covers: (from: string, to: string) => string;
  noDaysYet: string;
  generated: (when: string) => string;
  genericFormat: string;
  none: string;
  lessons: {
    title: string;
    note: string;
    scheduled: string;
    held: string;
    notHeld: string;
    notRecorded: string;
    heldShare: string;
  };
  reasons: { title: string; reason: string; count: string };
  subjects: { title: string; subject: string; noSubject: string };
  relief: { title: string; arranged: string; recordedHeld: string };
  tasks: {
    title: string;
    delivered: string;
    due: string;
    doneOnTime: string;
    doneLate: string;
    notDone: string;
    flagged: string;
    extensionsRequested: string;
    extensionsApproved: string;
    extensionsCountered: string;
    extensionsPending: string;
  };
  overrides: { title: string; note: string; count: string; date: string; reason: string; capped: (shown: number, total: number) => string };
  wellbeing: {
    title: string;
    note: string;
    withheld: (minimum: number) => string;
    teachingStaff: string;
    workingDays: string;
    averageFree: string;
    averageTask: string;
    flagged: string;
    extensionRequests: string;
  };
  sharedHours: { title: string; note: string; name: string; total: string; sharedOn: string; empty: string };
  /** Sheet names in the Excel file: at most 31 characters, none of : \ / ? * [ ]. */
  sheets: { summary: string; subjects: string; overrides: string; sharedHours: string };
  fieldErrors: Record<string, string>;
}
