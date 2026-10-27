import type { SpriteAction } from '../interfaces/character.interface';

/** How long each frame of a move stays on screen, in milliseconds. */
export const FRAME_MS: Record<SpriteAction, number> = { idle: 260, attack: 120, hit: 200, die: 240 };

/** Atlas pixels across one square figure box; sets how large the sprites are drawn in the arena. */
export const SHEET_SPAN = 100;
