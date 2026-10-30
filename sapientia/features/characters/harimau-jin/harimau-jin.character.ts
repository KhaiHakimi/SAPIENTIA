import type { Monster } from '../interfaces/character.interface';
import moves from './harimau-jin.module.css';

/** Malay monster. Medium: a spirit tiger that pounces in an arc. */
export const harimauJin: Monster = {
  id: 'harimau-jin',
  name: { ms: 'Harimau Jin', en: 'Spirit Tiger' },
  portrait: '/characters/harimau-jin/portrait.png',
  spriteSheet: {
    src: '/characters/harimau-jin/sprite-sheet.png',
    cellWidth: 301,
    cellHeight: 202,
    footLine: 0.9703,
    frames: { idle: { first: 0, count: 4 }, attack: { first: 4, count: 6 }, hit: { first: 10, count: 2 }, die: { first: 12, count: 4 } },
  },
  moves: { attack: moves.attack },
  subject: 'bm',
  hit: 25,
  level: 2,
};
