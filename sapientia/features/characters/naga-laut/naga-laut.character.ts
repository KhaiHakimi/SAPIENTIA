import type { Monster } from '../interfaces/character.interface';
import moves from './naga-laut.module.css';

/** Level 2, Medium: a sea serpent that rears back and strikes with a wave. */
export const nagaLaut: Monster = {
  id: 'naga-laut',
  name: { ms: 'Naga Laut', en: 'Sea Serpent' },
  portrait: '/characters/naga-laut/portrait.png',
  spriteSheet: {
    src: '/characters/naga-laut/sprite-sheet.png',
    cellWidth: 292,
    cellHeight: 186,
    footLine: 0.9677,
    frames: { idle: { first: 0, count: 4 }, attack: { first: 4, count: 7 }, hit: { first: 11, count: 2 }, die: { first: 13, count: 4 } },
  },
  moves: { attack: moves.attack },
  hit: 20,
  level: 2,
};
