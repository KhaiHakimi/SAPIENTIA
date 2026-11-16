import type { Metadata } from 'next';
import { StudentHome } from '@/features/student-dashboard/components/StudentHome';
import { QueryProvider } from '@/shared/api/QueryProvider';

export const metadata: Metadata = { title: 'Sapientia • Papan Pelajar' };

/** The student home (plan D8: magic-academy theme, toned down), for the pupil signed in on the server. */
export default function StudentPage() {
  return (
    <QueryProvider>
      <StudentHome />
    </QueryProvider>
  );
}
