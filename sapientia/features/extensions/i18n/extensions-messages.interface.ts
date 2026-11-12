export interface ExtensionsMessages {
  title: string;
  // Asking (the assignee)
  ask: string;
  currentDue: (day: string) => string;
  figuresLoading: string;
  figuresFailed: string;
  figuresShort: (needed: string, free: string) => string;
  figuresFit: (needed: string, free: string) => string;
  noEstimate: string;
  newDate: string;
  suggested: (day: string) => string;
  reason: string;
  reasonHelp: string;
  optional: string;
  send: string;
  sending: string;
  cancel: string;
  // The exchange, as kept on the task
  asked: (name: string, when: string, from: string, to: string) => string;
  askedFigures: (needed: string, free: string) => string;
  pending: string;
  approved: (name: string, day: string) => string;
  countered: (name: string, day: string) => string;
  // Answering (the sender)
  approve: (day: string) => string;
  otherDate: string;
  setOtherDate: string;
  saving: string;
  // Elsewhere on the task screens
  myDue: (day: string) => string;
  extendedTo: (day: string) => string;
  pendingCount: (count: number) => string;
  fieldErrors: Record<string, string>;
}
