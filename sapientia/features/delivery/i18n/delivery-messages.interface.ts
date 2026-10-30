import type { StateCode } from '../constants/delivery.constants';
import type { CalendarEventKind, IsoWeekday } from '../interfaces/working-calendar.interface';

export interface DeliveryMessages {
  loading: string;
  // Working hours
  settingsTitle: string;
  settingsIntro: string;
  timeZone: (zone: string) => string;
  workStart: string;
  workEnd: string;
  weekend: string;
  weekendHelp: string;
  weekdays: Record<IsoWeekday, string>;
  state: string;
  noState: string;
  states: Record<StateCode, string>;
  suggestFridaySaturday: string;
  useSuggestion: string;
  save: string;
  saving: string;
  saved: string;
  heldUnchanged: string;
  // Calendar
  calendarTitle: string;
  calendarIntro: string;
  kinds: Record<CalendarEventKind, string>;
  kindHelp: Record<CalendarEventKind, string>;
  onDate: string;
  kind: string;
  eventTitle: string;
  eventTitlePlaceholder: string;
  add: string;
  adding: string;
  listTitle: string;
  empty: string;
  remove: string;
  removing: string;
  removeLabel: (title: string) => string;
  columns: { date: string; kind: string; title: string; actions: string };
  fieldErrors: Record<string, string>;
}
