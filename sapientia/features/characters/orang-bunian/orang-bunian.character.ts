import type { Monster } from '../interfaces/character.interface';
import moves from './orang-bunian.module.css';

/** Maths monster. Easy: a heavy, slow forest ogre whose club blow shakes the whole arena. */
export const orangBunian: Monster = {
  id: 'orang-bunian',
  name: { ms: 'Orang Bunian', en: 'Forest Ogre' },
  portrait: '/characters/orang-bunian/portrait.png',
  spriteSheet: {
    src: '/characters/orang-bunian/sprite-sheet.png',
    cellWidth: 190,
    cellHeight: 122,
    footLine: 0.9918,
    frames: { idle: { first: 0, count: 3 }, attack: { first: 3, count: 4 }, hit: { first: 7, count: 2 }, die: { first: 9, count: 3 } },
  },
  moves: { attack: moves.attack, impact: moves.impact },
  subject: 'math',
  hit: 20,
  level: 1,
};
