import type { Metadata } from 'next';
import { SentTasksPage } from '@/features/tasks/components/SentTasksPage';

export const metadata: Metadata = { title: 'Sapientia • Tugas Ditahan' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Senders: tasks created outside working hours that have not reached their assignees yet (plan Sprint 4). */
export default function Page() {
  return <SentTasksPage heldOnly />;
}
