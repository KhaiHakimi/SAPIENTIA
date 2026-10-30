import type { Monster } from '../interfaces/character.interface';
import moves from './orang-bunian.module.css';

/** Maths monster. Easy: a heavy, slow forest ogre whose club blow shakes the whole arena. */
export const orangBunian: Monster = {
  id: 'orang-bunian',
  name: { ms: 'Orang Bunian', en: 'Forest Ogre' },
  portrait: '/characters/orang-bunian/portrait.png',
  spriteSheet: {
    src: '/characters/orang-bunian/sprite-sheet.png',
    cellWidth: 299,
    cellHeight: 239,
    footLine: 0.9749,
    frames: { idle: { first: 0, count: 4 }, attack: { first: 4, count: 7 }, hit: { first: 11, count: 2 }, die: { first: 13, count: 4 } },
  },
  moves: { attack: moves.attack, impact: moves.impact },
  subject: 'math',
  hit: 20,
  level: 1,
};
