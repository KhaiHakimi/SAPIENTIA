import type { RedactionResult } from '@/shared/interfaces/llm.interface';

/** What a removed name or number becomes in the text sent to the model. */
export const REDACTED_NAME = '[nama]';
export const REDACTED_NUMBER = '[nombor]';
export const REDACTED_EMAIL = '[emel]';

/** Words inside names that are not themselves names (titles, "son of", "daughter of"); removing them everywhere would mangle text. */
const NOT_NAME_WORDS = new Set([
  'bin', 'binti', 'bt', 'bte', 'b', 'a/l', 'a/p', 'al', 'ap', 'anak', 'ak', 'cikgu', 'cg', 'puan', 'pn', 'encik', 'en', 'tuan',
  'dr', 'hj', 'haji', 'hajah', 'hjh', 'ustaz', 'ustazah', 'mr', 'mrs', 'ms', 'miss', 'sir', 'madam', 'datin', 'dato', 'datuk',
  'sri', 'seri', 'tan', 'toh', 'puteri', 'putera', 'syed', 'sharifah', 'nik', 'wan', 'che', 'mohd', 'muhammad', 'mohamad',
  'mohammad', 'muhamad', 'nur', 'nor', 'siti', 'abdul', 'abd',
]);
const NAME_PART_MIN = 3;

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
// MyKad-like (YYMMDD-PB-###G, dashes optional) and phone numbers (Malaysian mobiles and landlines, with or without +60).
const MYKAD = /(?<![\p{N}])\d{6}-?\d{2}-?\d{4}(?![\p{N}])/gu;
const PHONE = /(?<![\p{N}+])(?:\+?6?0)[\s-]?\d{1,2}[\s-]?\d{3,4}[\s-]?\d{4}(?![\p{N}])/gu;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** The parts of a name worth removing on their own: long enough, and not a title or "bin"/"binti". */
function nameParts(name: string): string[] {
  return name.split(/\s+/).map((part) => part.replace(/[^\p{L}\p{N}'/-]/gu, '')).filter((part) =>
    part.length >= NAME_PART_MIN && !NOT_NAME_WORDS.has(part.toLowerCase()));
}

/**
 * Removes personal data from text before it goes to a language model (plan Phase 6: "send task text only, never names").
 * Every full name given, and each distinctive part of it, is replaced as a whole word, case-insensitively; emails,
 * MyKad-like numbers and phone numbers are replaced by pattern. Names the school does not hold (a visitor, say) cannot be
 * known here, which is why the screen also asks people not to type them.
 */
export function redactPersonalData(text: string, names: readonly string[]): RedactionResult {
  let removed = 0;
  const replace = (pattern: RegExp, by: string) => {
    text = text.replace(pattern, () => {
      removed++;
      return by;
    });
  };
  replace(EMAIL, REDACTED_EMAIL);
  replace(MYKAD, REDACTED_NUMBER);
  replace(PHONE, REDACTED_NUMBER);

  const terms = new Set<string>();
  for (const name of names) {
    const full = name.trim().replace(/\s+/g, ' ');
    if (full.length >= NAME_PART_MIN) terms.add(full.toLowerCase());
    for (const part of nameParts(full)) terms.add(part.toLowerCase());
  }
  if (terms.size > 0) {
    // Longest first, so a full name is replaced once rather than part by part.
    const alternatives = [...terms].sort((a, b) => b.length - a.length).map((term) => escapeRegExp(term).replace(/ /g, '\\s+'));
    replace(new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}])`, 'giu'), REDACTED_NAME);
    // "[nama] [nama]" left by a first and last name typed apart reads as one person.
    text = text.replace(/\[nama\](?:\s+\[nama\])+/g, REDACTED_NAME);
  }
  return { text, removed };
}
