export interface BattleMessages {
  lairTitle: string;
  lairIntro: string;
  fight: string;
  fightAgain: string;
  beaten: string;
  locked: string;
  /** Why a level is locked: the level before it is not beaten yet. */
  unlockHint: (previousLevel: string) => string;
  hitsFor: (hit: number) => string;
  /** Indexed by monster level (1 to 4); index 0 is unused. */
  levels: readonly string[];
  record: (attempts: number, wins: number) => string;
  subjectsLabel: string;
  chapter: (number: number, title: string) => string;
  /** Levels beaten out of the chapter's four. */
  cleared: (beaten: number, total: number) => string;
  /** The short subject and chapter tag in the battle text box. */
  chapterTag: (subject: string, number: number) => string;
  /** One stage in full, for the suggested practice. */
  stage: (subject: string, number: number, level: string) => string;

  close: string;
  answerWas: string;
  more: string;
  menuLabel: string;
  leave: string;
  dialogTitle: (monster: string) => string;
  appeared: (monster: string) => string;
  /** A monster's own line, quoted after its name. */
  speaks: (name: string, line: string) => string;
  go: (hero: string) => string;
  rightMove: (hero: string) => string;
  foeHit: (monster: string, damage: number) => string;
  wrongMove: (monster: string) => string;
  heroHurt: (hero: string, damage: number) => string;
  foeFainted: (monster: string) => string;
  winStats: (right: number, wrong: number) => string;
  reward: (hero: string, xp: number, coins: number) => string;
  unlocked: (level: string) => string;
  revisit: (chapter: string, wrong: number) => string;
  heroFainted: (hero: string) => string;
  retryHint: string;
  again: string;
  retry: string;
}
