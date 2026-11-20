import type { IsoWeekday } from '@/features/delivery/interfaces/working-calendar.interface';

export const WEEKDAYS: readonly IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

export const SLOT_LABEL_MAX = 80;

/** A full week of 40-minute periods is about 60 rows; the cap only stops a runaway script. */
export const SLOTS_PER_TEACHER_MAX = 200;
