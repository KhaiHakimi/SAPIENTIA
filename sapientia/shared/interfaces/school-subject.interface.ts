import type { LocalizedText } from './localized-text.interface';

/** Every subject on the timetable. Quiz battles, mastery bars and timetable slots all use these keys. */
export type SchoolSubjectKey = 'bm' | 'bi' | 'math' | 'sci' | 'pe' | 'art' | 'music' | 'moral' | 'history';

export interface SchoolSubject {
  key: SchoolSubjectKey;
  name: LocalizedText;
}
