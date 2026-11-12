import type { Metadata } from 'next';
import { LessonsPage } from '@/features/lessons/components/LessonsPage';

export const metadata: Metadata = { title: 'Sapientia • Rekod Kelas' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Everyone records their own periods, and the relief classes they cover. The API enforces who may record what. */
export default function Page() {
  return <LessonsPage />;
}
