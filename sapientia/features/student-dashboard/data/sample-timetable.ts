import type { TextOrLocalized } from '@/shared/interfaces/localized-text.interface';
import type { SchoolSubjectKey } from '@/shared/interfaces/school-subject.interface';
import type { SchoolWeek, TimetableSlot } from '../interfaces/timetable.interface';

/** Sample week, Monday to Friday. Thursday is "today" in the demo (see demo-clock.constants). */
const SLOT_TIMES: readonly (readonly [string, string])[] = [['08:00', '08:30'], ['08:30', '09:30'], ['09:30', '10:30'], ['11:00', '12:00'], ['12:00', '13:00']];
const HOME_ROOM = 'B2-1';
const LAB = { ms: 'Makmal 1', en: 'Lab 1' };
const FIELD = { ms: 'Padang', en: 'Field' };

function day(subjects: SchoolSubjectKey[], rooms: Partial<Record<number, TextOrLocalized>> = {}, relief: number[] = []): TimetableSlot[] {
  return subjects.map((subject, i) => ({
    from: SLOT_TIMES[i][0],
    to: SLOT_TIMES[i][1],
    subject,
    room: rooms[i] ?? HOME_ROOM,
    ...(relief.includes(i) ? { relief: true } : {}),
  }));
}

export const SAMPLE_WEEK: SchoolWeek = [
  day(['bm', 'history', 'math', 'bi', 'art'], { 4: { ms: 'Bilik Seni', en: 'Art Room' } }),
  day(['math', 'sci', 'bm', 'moral', 'pe'], { 1: LAB, 4: FIELD }),
  day(['bi', 'bm', 'sci', 'music', 'math'], { 2: LAB, 3: { ms: 'Bilik Muzik', en: 'Music Room' } }),
  day(['bm', 'math', 'sci', 'pe', 'bi'], { 2: LAB, 3: FIELD }, [2]),
  day(['bm', 'math', 'bi', 'moral', 'pe'], { 4: FIELD }),
];
