export type HoursKind = 'marking' | 'preparation' | 'administration' | 'meetings' | 'other';

/** One entry in the caller's own private hours log. Nobody else can read it. */
export interface HoursEntry {
  id: string;
  onDate: string;
  minutes: number;
  kind: HoursKind;
  note: string | null;
}

/** A monthly total the owner chose to share: the figure when they shared it, not the live total. */
export interface HoursShare {
  minutes: number;
  sharedAt: string;
}

/** GET /api/me/hours?month=YYYY-MM: the caller's own month. */
export interface HoursMonth {
  month: string;
  entries: HoursEntry[];
  totalMinutes: number;
  share: HoursShare | null;
}

/** POST /api/me/hours. */
export interface NewHoursEntry {
  onDate: string;
  minutes: number;
  kind: HoursKind;
  note?: string;
}
