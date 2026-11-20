/** A value in the report: text, or a count kept as a number so Excel can add it up. */
export type ReportValue = string | number;

export interface ReportFact {
  label: string;
  value: ReportValue;
}

export interface ReportTable {
  columns: string[];
  rows: ReportValue[][];
  /** Per column: true when every value is a number (right-aligned, kept numeric in Excel). */
  numeric: boolean[];
  /** Shown instead of the table when it has no rows. */
  empty: string;
}

/** One section of the report, in the order it is shown. A section has facts, a table, or both. */
export interface ReportSection {
  id: 'lessons' | 'reasons' | 'subjects' | 'relief' | 'tasks' | 'overrides' | 'wellbeing' | 'sharedHours';
  title: string;
  notes: string[];
  facts: ReportFact[];
  table: ReportTable | null;
}

/**
 * The monthly report as words and numbers in one language. The page, the PDF and the Excel file all render this, so the
 * three always say the same thing.
 */
export interface ReportDocument {
  title: string;
  /** School name, the days covered (or that none have finished), when it was prepared, and the format note. */
  heading: string[];
  sections: ReportSection[];
}
