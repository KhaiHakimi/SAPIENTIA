import type { LocalizedText } from '@/shared/interfaces/localized-text.interface';

/** The moves every battle sprite sheet has, in this order on the sheet. */
export type SpriteAction = 'idle' | 'attack' | 'hit' | 'die';

export interface SpriteFrames {
  /** Index of the first cell of this move on the sheet. */
  first: number;
  count: number;
}

/**
 * A battle sprite sheet: one row of equal cells (idle, attack, hit, die), every frame standing with its feet on the same line.
 * Cut by scripts/cut-sprite-sheets.mjs from the atlases in ../Character; the monsters face left, towards the player.
 */
export interface SpriteSheet {
  src: string;
  cellWidth: number;
  cellHeight: number;
  /** Where the feet are, as a fraction of the cell height from the top. */
  footLine: number;
  frames: Record<SpriteAction, SpriteFrames>;
}

/** CSS-module classes that give a character its own way of moving in battle. Missing ones fall back to the default moves. */
export interface CharacterMoves {
  /** On the stage while attacking (the lunge across the arena). */
  attack?: string;
  /** On the figure while being hit (the flash and knock-back). */
  hit?: string;
  /** On the arena when this character lands a blow (screen shake). */
  impact?: string;
  /** Always on the sprite (a glow, for example). */
  sprite?: string;
}

export type CharacterId = 'pendekar' | 'orang-bunian' | 'naga-laut' | 'harimau-jin' | 'hantu-lelaki';

export interface Character {
  id: CharacterId;
  name: LocalizedText;
  /** The large still picture used in the lair, icons and the Pahlawan Saya preview. */
  portrait: string;
  spriteSheet: SpriteSheet;
  moves: CharacterMoves;
}

/** 1 Easy, 2 Medium, 3 Hard, 4 Very Hard. */
export type MonsterLevel = 1 | 2 | 3 | 4;

/** A quiz monster: one per difficulty level. Every chapter of every subject has a question set for each level. */
export interface Monster extends Character {
  /** HP the student loses on a wrong answer. */
  hit: number;
  level: MonsterLevel;
}
