import type { NewStudentRow } from '../interfaces/student.interface';

/** One pupil read from a pasted line, with the line number (from 1) so problems can be shown against it. */
export interface ParsedPupil extends NewStudentRow {
  line: number;
}

/**
 * Reads a pasted class list: one pupil per line, the name then optionally a tab (a column copied from Excel) or the last
 * comma and the school number. Blank lines are skipped. The server checks every value again.
 */
export function parseClassList(text: string): ParsedPupil[] {
  const pupils: ParsedPupil[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const tab = line.indexOf('\t');
    const split = tab >= 0 ? tab : line.lastIndexOf(',');
    const name = (split >= 0 ? line.slice(0, split) : line).trim();
    const schoolNumber = split >= 0 ? line.slice(split + 1).trim() || null : null;
    pupils.push({ line: index + 1, name, schoolNumber });
  });
  return pupils;
}
