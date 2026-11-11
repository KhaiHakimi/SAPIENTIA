export interface CapacityMessages {
  needsEstimate: string;
  checking: string;
  checkFailed: string;
  allFit: (count: number) => string;
  warningTitle: (short: number, total: number) => string;
  /** One line per person who has no time: what is needed, what is free, and where the rest of the time goes. */
  shortLine: (name: string, needed: string, free: string) => string;
  breakdown: (teaching: string, committed: string) => string;
  earliest: (day: string) => string;
  noEarliest: string;
  useDate: (day: string) => string;
  stillSend: string;
}
