/** The two interface languages: Bahasa Melayu and English. */
export type Lang = 'ms' | 'en';

/** A piece of text written in both languages. */
export interface LocalizedText {
  ms: string;
  en: string;
}

/** Text that is the same in both languages (a room code, a number) or written in both. */
export type TextOrLocalized = string | LocalizedText;
