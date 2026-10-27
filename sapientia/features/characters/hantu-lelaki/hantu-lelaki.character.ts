import type { Monster } from '../interfaces/character.interface';
import moves from './hantu-lelaki.module.css';

/** English monster. Hard: a ghost warrior that glides in, fades when hit and glows blue. */
export const hantuLelaki: Monster = {
  id: 'hantu-lelaki',
  name: { ms: 'Hantu Lelaki', en: 'Ghost Warrior' },
  portrait: '/characters/hantu-lelaki/portrait.png',
  spriteSheet: {
    src: '/characters/hantu-lelaki/sprite-sheet.png',
    cellWidth: 194,
    cellHeight: 124,
    footLine: 0.9839,
    frames: { idle: { first: 0, count: 3 }, attack: { first: 3, count: 4 }, hit: { first: 7, count: 2 }, die: { first: 9, count: 2 } },
  },
  moves: { attack: moves.attack, hit: moves.hit, sprite: moves.glow },
  subject: 'bi',
  hit: 34,
  level: 3,
};
