import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TaskDetailPage } from '@/features/tasks/components/TaskDetailPage';

export const metadata: Metadata = { title: 'Sapientia • Tugas' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** One task, for its sender and assignees; anyone else sees not found. The id is runtime data, so it is read in Suspense. */
export default function Page({ params }: PageProps<'/staff/tasks/[id]'>) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => <TaskDetailPage id={id} />)}
    </Suspense>
  );
}
