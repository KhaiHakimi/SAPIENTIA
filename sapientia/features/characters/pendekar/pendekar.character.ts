import type { Character } from '../interfaces/character.interface';

/** The student's battle character: a pendekar with a keris. Uses the default lunge and hit moves. */
export const pendekar: Character = {
  id: 'pendekar',
  name: { ms: 'Pendekar', en: 'Pendekar' },
  portrait: '/characters/pendekar/portrait.png',
  spriteSheet: {
    src: '/characters/pendekar/sprite-sheet.png',
    cellWidth: 136,
    cellHeight: 101,
    footLine: 0.9901,
    frames: { idle: { first: 0, count: 4 }, attack: { first: 4, count: 4 }, hit: { first: 8, count: 2 }, die: { first: 10, count: 3 } },
  },
  moves: {},
};
