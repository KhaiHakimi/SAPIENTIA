import type { Metadata } from 'next';
import { TimetablePage } from '@/features/timetable/components/TimetablePage';

export const metadata: Metadata = { title: 'Sapientia • Jadual Waktu' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Everyone sees their own weekly timetable; administrators choose a teacher and edit. The API enforces both. */
export default function Page() {
  return <TimetablePage />;
}
