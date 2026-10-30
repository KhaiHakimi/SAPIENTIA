import type { Metadata } from 'next';
import { SentTasksPage } from '@/features/tasks/components/SentTasksPage';

export const metadata: Metadata = { title: 'Sapientia • Tugas Dihantar' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Tasks the signed-in user sent, with progress. */
export default function Page() {
  return <SentTasksPage />;
}
