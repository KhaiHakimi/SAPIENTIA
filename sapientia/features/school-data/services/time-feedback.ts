import type { TimeTaken } from '@/features/tasks/interfaces/task.interface';

/** Answers are shown only once this many different people have given them: fewer would point at the one or two who did. */
export const FEEDBACK_MIN_PEOPLE = 3;

/** How the answers compare with the estimate: most say longer, most say shorter, most agree, or no band has a majority. */
export type FeedbackVerdict = 'longer' | 'shorter' | 'matches' | 'mixed';

const BAND_ORDER: readonly TimeTaken[] = ['under_1h', '1_to_3h', 'over_3h'];

/** The band an estimate falls in: under an hour, one to three hours (inclusive), or over three. */
export function estimateBand(estimatedMinutes: number): TimeTaken {
  if (estimatedMinutes < 60) return 'under_1h';
  return estimatedMinutes <= 180 ? '1_to_3h' : 'over_3h';
}

/**
 * Compares a task type's estimate with what people said the work took. Only a band chosen by more than half the answers
 * counts as what "most" said; anything less is reported as mixed instead of being read as a signal.
 */
export function feedbackVerdict(estimatedMinutes: number, answers: Record<TimeTaken, number>): FeedbackVerdict {
  const total = BAND_ORDER.reduce((sum, band) => sum + answers[band], 0);
  const majority = BAND_ORDER.find((band) => answers[band] * 2 > total);
  if (!majority) return 'mixed';
  const difference = BAND_ORDER.indexOf(majority) - BAND_ORDER.indexOf(estimateBand(estimatedMinutes));
  if (difference === 0) return 'matches';
  return difference > 0 ? 'longer' : 'shorter';
}
