import type { Monster } from '../interfaces/character.interface';
import moves from './naga-laut.module.css';

/** Science monster. Medium: a sea serpent that rears back and strikes with a wave. */
export const nagaLaut: Monster = {
  id: 'naga-laut',
  name: { ms: 'Naga Laut', en: 'Sea Serpent' },
  portrait: '/characters/naga-laut/portrait.png',
  spriteSheet: {
    src: '/characters/naga-laut/sprite-sheet.png',
    cellWidth: 144,
    cellHeight: 124,
    footLine: 0.9758,
    frames: { idle: { first: 0, count: 3 }, attack: { first: 3, count: 4 }, hit: { first: 7, count: 1 }, die: { first: 8, count: 2 } },
  },
  moves: { attack: moves.attack },
  subject: 'sci',
  hit: 25,
  level: 2,
};
