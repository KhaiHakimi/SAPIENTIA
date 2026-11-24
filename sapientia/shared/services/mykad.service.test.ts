import { describe, expect, it } from 'vitest';
import { containsMyKad, looksLikeMyKad } from './mykad.service';

// Every way of writing one fictional number that staff have been seen to type, or that a review found slipping through.
const MYKAD_FORMS = [
  '010203145678',
  '010203-14-5678',
  '010203 14 5678',
  '010203/14/5678',
  '010203.14.5678',
  '010203–14–5678',
  'IC010203145678',
  'IC 010203 14 5678',
  'IC: 010203-14-5678',
  '０１０２０３－１４－５６７８',
];

describe('containsMyKad', () => {
  it.each(MYKAD_FORMS)('finds %s on its own and inside a sentence', (form) => {
    expect(containsMyKad(form)).toBe(true);
    expect(containsMyKad(`Nombor ibu ${form}, sila semak.`)).toBe(true);
  });

  it.each([
    'Bagus! Semak soalan 4 dan 12 sekali lagi.',
    'Hantar sebelum 24/03/2027 pukul 10.30.',
    'Muka surat 120 hingga 135',
    'Telefon pejabat 03-1234 5678',
    'Akaun 1234567890123456',
    '0102031456789',
  ])('lets ordinary text through: %s', (text) => {
    expect(containsMyKad(text)).toBe(false);
  });
});

describe('looksLikeMyKad', () => {
  it.each([...MYKAD_FORMS, '010203 - 14 - 5678', '0102 0314 5678', '01-02-03-14-56-78', 'Ali 0102 0314 5678'])('refuses %s', (value) => {
    expect(looksLikeMyKad(value)).toBe(true);
  });

  it.each(['M2027/02', 'A123', '2027-0001', 'SMK/2027/1234', '4B-15', 'Aisyah binti Rahman', 'Kavitha a/p Raman', ''])(
    'lets a normal value through: %s',
    (value) => {
      expect(looksLikeMyKad(value)).toBe(false);
    },
  );
});
