/** The school's date and time of day, whatever time zone the device is set to. */
export interface SchoolNow {
  /** YYYY-MM-DD at the school. */
  today: string;
  /** Minutes after midnight at the school. */
  minutes: number;
}
