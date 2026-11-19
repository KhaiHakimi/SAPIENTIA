/**
 * How alike two task titles are, from 0 to 1, without a language model (plan Phase 6 duplicate detection works with AI
 * switched off). Two measures, and the higher wins: shared words (catches reordering: "Markah PBD hantar" against "Hantar
 * markah PBD") and shared letter triples (catches typos and endings: "laporan" against "laporannya").
 */

/** Words that say nothing about what the task is, in Bahasa Melayu and English. */
const STOP_WORDS = new Set([
  'dan', 'atau', 'yang', 'untuk', 'bagi', 'di', 'ke', 'dari', 'daripada', 'pada', 'dengan', 'kepada', 'ini', 'itu', 'sila',
  'tolong', 'mohon', 'segera', 'semua', 'guru', 'cikgu', 'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'by',
  'with', 'please', 'all', 'teachers', 'before', 'sebelum',
]);

export const SIMILARITY_THRESHOLD = 0.6;

export function normaliseTitle(title: string): string {
  return title.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function words(normalised: string): Set<string> {
  return new Set(normalised.split(' ').filter((word) => word.length > 1 && !STOP_WORDS.has(word)));
}

function trigrams(normalised: string): Set<string> {
  const grams = new Set<string>();
  for (const word of normalised.split(' ').filter((part) => !STOP_WORDS.has(part))) {
    const padded = `  ${word} `;
    for (let i = 0; i + 3 <= padded.length; i++) grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

const overlap = (a: Set<string>, b: Set<string>) => [...a].filter((item) => b.has(item)).length;

/** Jaccard on words, Dice on letter triples; 0 when either title has nothing left after the stop words. */
export function titleSimilarity(a: string, b: string): number {
  const [left, right] = [normaliseTitle(a), normaliseTitle(b)];
  const [wordsA, wordsB] = [words(left), words(right)];
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const shared = overlap(wordsA, wordsB);
  const jaccard = shared / (wordsA.size + wordsB.size - shared);
  const [gramsA, gramsB] = [trigrams(left), trigrams(right)];
  const dice = (2 * overlap(gramsA, gramsB)) / (gramsA.size + gramsB.size);
  return Math.max(jaccard, dice);
}
