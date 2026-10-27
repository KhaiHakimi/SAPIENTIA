import type { SchoolSubject, SchoolSubjectKey } from '@/shared/interfaces/school-subject.interface';

export const SCHOOL_SUBJECTS: Record<SchoolSubjectKey, SchoolSubject> = {
  bm: { key: 'bm', name: { ms: 'Bahasa Melayu', en: 'Malay Language' } },
  bi: { key: 'bi', name: { ms: 'Bahasa Inggeris', en: 'English' } },
  math: { key: 'math', name: { ms: 'Matematik', en: 'Mathematics' } },
  sci: { key: 'sci', name: { ms: 'Sains', en: 'Science' } },
  pe: { key: 'pe', name: { ms: 'Pendidikan Jasmani', en: 'Physical Education' } },
  art: { key: 'art', name: { ms: 'Pendidikan Seni', en: 'Art Education' } },
  music: { key: 'music', name: { ms: 'Pendidikan Muzik', en: 'Music' } },
  moral: { key: 'moral', name: { ms: 'Pendidikan Islam / Moral', en: 'Islamic / Moral Education' } },
  history: { key: 'history', name: { ms: 'Sejarah', en: 'History' } },
};
