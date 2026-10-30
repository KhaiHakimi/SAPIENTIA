import type { Metadata } from 'next';
import { TaskBoard } from '@/features/tasks/components/TaskBoard';

export const metadata: Metadata = { title: 'Sapientia • Papan Tugas' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Everyone's own board: four columns of their assignments. */
export default function Page() {
  return <TaskBoard />;
}
