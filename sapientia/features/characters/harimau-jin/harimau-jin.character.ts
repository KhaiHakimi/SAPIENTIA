import type { Monster } from '../interfaces/character.interface';
import moves from './harimau-jin.module.css';

/** Malay monster. Medium: a spirit tiger that pounces in an arc. */
export const harimauJin: Monster = {
  id: 'harimau-jin',
  name: { ms: 'Harimau Jin', en: 'Spirit Tiger' },
  portrait: '/characters/harimau-jin/portrait.png',
  spriteSheet: {
    src: '/characters/harimau-jin/sprite-sheet.png',
    cellWidth: 202,
    cellHeight: 115,
    footLine: 0.9913,
    frames: { idle: { first: 0, count: 3 }, attack: { first: 3, count: 4 }, hit: { first: 7, count: 1 }, die: { first: 8, count: 2 } },
  },
  moves: { attack: moves.attack },
  subject: 'bm',
  hit: 25,
  level: 2,
};
