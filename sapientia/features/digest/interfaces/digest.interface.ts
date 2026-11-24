/** The week a digest covers, once its sending time has come. Dates are school-local YYYY-MM-DD. */
export interface DigestWeek {
  /** The first day of the school's week: Monday, or Sunday where the weekend is Friday and Saturday. */
  weekOf: string;
  /** Six days later. */
  weekEndsOn: string;
  today: string;
}

export interface DigestTask {
  taskId: string;
  title: string;
  /** The person's own due date (later after an extension). */
  dueOn: string;
}

export interface DigestRelief {
  onDate: string;
  startTime: string;
  endTime: string;
  className: string | null;
}

/** Everything one person's Monday email says. Only their own work: never anyone else's load. */
export interface WeeklyDigest {
  recipientName: string;
  week: DigestWeek;
  overdue: DigestTask[];
  dueThisWeek: DigestTask[];
  /** Totals, which can be more than the lists show. */
  overdueCount: number;
  dueThisWeekCount: number;
  relief: DigestRelief[];
  /** Requests for more time on tasks this person sent, still waiting for an answer. */
  extensionsWaiting: number;
  /** Absolute link to the board, or null when APP_ORIGIN is not set. */
  boardLink: string | null;
}

export interface DigestSweepResult {
  sent: number;
  empty: number;
  failed: number;
  /** Temporary failures: not recorded, so the next sweep tries again. */
  retry: number;
}
