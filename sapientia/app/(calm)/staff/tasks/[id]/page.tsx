import type { Metadata } from 'next';
import { TaskDetailPage } from '@/features/tasks/components/TaskDetailPage';

export const metadata: Metadata = { title: 'Sapientia • Tugas' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** One task, for its sender and assignees; anyone else sees not found. */
export default function Page() {
  return <TaskDetailPage />;
}
