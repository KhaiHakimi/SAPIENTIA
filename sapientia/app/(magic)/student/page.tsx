import type { Metadata } from 'next';
import { StudentHome } from '@/features/student-dashboard/components/StudentHome';

export const metadata: Metadata = { title: 'Sapientia • Papan Pelajar' };

/** The student home (plan D8: magic-academy theme, toned down). Needs a signed-in mock student; sample data until the API exists. */
export default function StudentPage() {
  return <StudentHome />;
}
