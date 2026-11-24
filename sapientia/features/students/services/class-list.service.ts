import type { ParsedPupil } from '../interfaces/student.interface';

/** Commas and tabs: either one separates the name from the school number. */
const SEPARATORS = /[,\t]/g;

/**
 * Reads a pasted class list: one pupil per line, the name then optionally a tab (a column copied from Excel) or a comma and
 * the school number. Blank lines are skipped. The server checks every value again.
 *
 * A line with more than one separator is flagged, not guessed at: a third column is often a MyKad number, and splitting on
 * the last separator would have put it into the name, which is shown on slips and stored.
 */
export function parseClassList(text: string): ParsedPupil[] {
  const pupils: ParsedPupil[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    if ((line.match(SEPARATORS)?.length ?? 0) > 1) {
      pupils.push({ line: index + 1, name: line, schoolNumber: null, problem: 'too_many_values' });
      return;
    }
    const split = line.search(SEPARATORS);
    const name = (split >= 0 ? line.slice(0, split) : line).trim();
    const schoolNumber = split >= 0 ? line.slice(split + 1).trim() || null : null;
    pupils.push({ line: index + 1, name, schoolNumber });
  });
  return pupils;
}
