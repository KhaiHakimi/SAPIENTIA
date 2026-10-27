import type { TextOrLocalized } from '@/shared/interfaces/localized-text.interface';
import type { Monster } from '@/features/characters';
import type { BattleMessages } from '../i18n/battle-messages.interface';
import type { BattleRecord } from './battle-run.interface';

export type BattleSide = 'foe' | 'me';

/**
 * What the battle script needs from the screen. The React dialog implements it with refs; tests can implement it with fakes.
 * Every promise rejects with BattleCancelled once the dialog closes, which stops the script wherever it is.
 */
export interface BattleView {
  /** Type a line into the text box. */
  say: (text: string) => Promise<void>;
  setTopic: (text: string) => void;
  /** Show the blinking arrow and wait for the student to press it. */
  waitForMore: () => Promise<void>;
  /** Show a menu (the answers, or Fight again / Leave) and resolve with the index picked. */
  choose: (labels: string[]) => Promise<number>;
  wait: (ms: number) => Promise<void>;
  setHp: (side: BattleSide, hp: number, max: number, instant?: boolean) => void;
  setRecord: (record: BattleRecord) => void;
  /** Clear every animation state and show both figures idle, ready for a new run. */
  resetArena: () => void;
  slideIn: () => Promise<void>;
  heroAttacks: () => Promise<void>;
  foeHurt: () => Promise<void>;
  foeAttacks: () => Promise<void>;
  heroHurt: () => Promise<void>;
  foeFalls: () => Promise<void>;
  heroCheers: () => Promise<void>;
  heroFalls: () => Promise<void>;
  close: () => void;
}

/** What the battle script needs from the rest of the dashboard. */
export interface BattleContext {
  monster: Monster;
  /** Read at each line, so a language switch shows up on the next line. */
  messages: () => BattleMessages;
  pick: (value: TextOrLocalized) => string;
  heroName: () => string;
  /** Count a finished fight and return the updated record. */
  recordResult: (won: boolean) => BattleRecord;
  /** Pay the first-win reward; false when this monster has already paid out this visit. */
  claimFirstWin: () => boolean;
  /** Celebration after a reward (coin burst). */
  celebrate: () => void;
}

export class BattleCancelled extends Error {
  constructor() {
    super('The battle dialog was closed.');
    this.name = 'BattleCancelled';
  }
}
