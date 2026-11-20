import type { Metadata } from 'next';
import { HomeworkPage } from '@/features/homework/components/HomeworkPage';

export const metadata: Metadata = { title: 'Sapientia • Kerja Rumah' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Staff who teach: set homework, see the class's week, tick paper hand-ins and marking. */
export default function Homework() {
  return <HomeworkPage />;
}
