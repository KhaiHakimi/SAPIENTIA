import type { Character } from '../interfaces/character.interface';

/** The student's battle character: a pendekar with a keris. Uses the default lunge and hit moves. */
export const pendekar: Character = {
  id: 'pendekar',
  name: { ms: 'Pendekar', en: 'Pendekar' },
  portrait: '/characters/pendekar/portrait.png',
  spriteSheet: {
    src: '/characters/pendekar/sprite-sheet.png',
    cellWidth: 260,
    cellHeight: 238,
    footLine: 0.9748,
    frames: { idle: { first: 0, count: 3 }, attack: { first: 3, count: 6 }, hit: { first: 9, count: 2 }, die: { first: 11, count: 4 } },
  },
  moves: {},
};
