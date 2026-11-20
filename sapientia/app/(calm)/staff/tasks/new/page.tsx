import type { Metadata } from 'next';
import { CreateTaskPage } from '@/features/tasks/components/CreateTaskPage';

export const metadata: Metadata = { title: 'Sapientia • Tugas Baharu' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Senders and administrators create a task; the API refuses teachers. */
export default function Page() {
  return <CreateTaskPage />;
}
