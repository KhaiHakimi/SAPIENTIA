export interface BattleMessages {
  lairTitle: string;
  lairIntro: string;
  fight: string;
  fightAgain: string;
  beaten: string;
  questionCount: (count: number) => string;
  hitsFor: (hit: number) => string;
  /** Indexed by monster level (1 to 3); index 0 is unused. */
  levels: readonly string[];
  record: (attempts: number, wins: number) => string;

  close: string;
  answerWas: string;
  more: string;
  menuLabel: string;
  leave: string;
  dialogTitle: (monster: string) => string;
  appeared: (monster: string) => string;
  go: (hero: string) => string;
  rightMove: (hero: string) => string;
  foeHit: (monster: string, damage: number) => string;
  wrongMove: (monster: string) => string;
  heroHurt: (hero: string, damage: number) => string;
  foeFainted: (monster: string) => string;
  winStats: (right: number, wrong: number) => string;
  reward: (hero: string, xp: number, coins: number) => string;
  weakTopics: (list: string) => string;
  heroFainted: (hero: string) => string;
  retryHint: string;
  again: string;
  retry: string;
}
