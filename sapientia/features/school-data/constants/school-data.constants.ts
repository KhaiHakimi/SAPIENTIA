import type { SchoolDataKind } from '../interfaces/school-data.interface';

export const SCHOOL_DATA_KINDS = ['subjects', 'classes', 'task-types'] as const satisfies readonly SchoolDataKind[];

export const SCHOOL_DATA_NAME_MAX = 80;

/** A school's list is short; the cap only stops a runaway script from filling the table. */
export const SCHOOL_DATA_ITEMS_MAX = 300;
