import type { Relic } from '../interfaces/relic.interface';

/** Sample relics. "guardian-defeated" and "handed-in-early" follow the quest list, so Undo stays consistent. */
export const SAMPLE_RELICS: readonly Relic[] = [
  { id: 'first', sprite: 'key', name: { ms: 'Kunci Pertama', en: 'First Key' }, hint: { ms: 'Hantar tugasan pertama', en: 'Hand in your first task' }, unlock: 'earned' },
  { id: 'streak3', sprite: 'flame', name: { ms: 'Api Semangat', en: 'Spirit Flame' }, hint: { ms: '3 hari berturut-turut', en: '3-day streak' }, unlock: 'earned' },
  { id: 'reader', sprite: 'scroll', name: { ms: 'Gulungan Ilmu', en: 'Scroll of Lore' }, hint: { ms: 'Log bacaan lengkap', en: 'Finish a reading log' }, unlock: 'earned' },
  { id: 'perfect', sprite: 'crown', name: { ms: 'Mahkota Hari Sempurna', en: 'Crown of the Perfect Day' }, hint: { ms: 'Tewaskan Penjaga Minggu', en: 'Defeat the Weekly Guardian' }, unlock: 'guardian-defeated' },
  { id: 'streak7', sprite: 'trophy', name: { ms: 'Piala Tujuh Hari', en: 'Seven-Day Cup' }, hint: { ms: '7 hari berturut-turut', en: '7-day streak' }, unlock: 'locked' },
  { id: 'early', sprite: 'owl', name: { ms: 'Burung Hantu Awal', en: 'Early Owl' }, hint: { ms: 'Hantar sehari lebih awal', en: 'Hand in a day early' }, unlock: 'handed-in-early' },
];
