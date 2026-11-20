import type { Monster } from '../interfaces/character.interface';
import moves from './hantu-lelaki.module.css';

/** Level 4, Very Hard: a ghost warrior that glides in, fades when hit and glows blue. */
export const hantuLelaki: Monster = {
  id: 'hantu-lelaki',
  name: { ms: 'Hantu Lelaki', en: 'Ghost Warrior' },
  portrait: '/characters/hantu-lelaki/portrait.png',
  spriteSheet: {
    src: '/characters/hantu-lelaki/sprite-sheet.png',
    cellWidth: 299,
    cellHeight: 222,
    footLine: 0.973,
    frames: { idle: { first: 0, count: 4 }, attack: { first: 4, count: 6 }, hit: { first: 10, count: 2 }, die: { first: 12, count: 4 } },
  },
  moves: { attack: moves.attack, hit: moves.hit, sprite: moves.glow },
  hit: 34,
  level: 4,
};
