import type { Metadata } from 'next';
import { StudentDashboard } from '@/features/student-dashboard/components/StudentDashboard';
import { StudentProgressProvider } from '@/features/student-dashboard/context/StudentProgressProvider';

export const metadata: Metadata = { title: 'Sapientia • Papan Pelajar' };

/** The student home (plan D8: magic-academy theme, toned down). Sample data only until the API exists. */
export default function StudentPage() {
  return (
    <StudentProgressProvider>
      <StudentDashboard />
    </StudentProgressProvider>
  );
}
