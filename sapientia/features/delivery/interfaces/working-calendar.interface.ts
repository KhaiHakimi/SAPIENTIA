/** ISO weekday: 1 Monday ... 7 Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Everything needed to decide whether a moment is inside a school's working hours. */
export interface WorkingCalendar {
  /** IANA zone, for example Asia/Kuala_Lumpur. */
  timeZone: string;
  /** "HH:mm", school-local. */
  workStart: string;
  workEnd: string;
  weekendDays: readonly IsoWeekday[];
  /** School-local dates (YYYY-MM-DD) with no delivery, even on a weekday. */
  holidays: ReadonlySet<string>;
  /** School-local dates (YYYY-MM-DD) that are working days even though they fall on the weekend. */
  extraWorkingDays: ReadonlySet<string>;
}

/** GET and PATCH /api/school/settings. */
export interface SchoolSettings {
  timeZone: string;
  workStart: string;
  workEnd: string;
  weekendDays: IsoWeekday[];
  stateCode: string | null;
}

export type CalendarEventKind = 'holiday' | 'working_day';

export interface CalendarEvent {
  id: string;
  onDate: string;
  kind: CalendarEventKind;
  title: string;
}

/** When a task created now would reach its assignees. */
export interface DeliveryPreview {
  deliverAt: string;
  held: boolean;
  timeZone: string;
}
