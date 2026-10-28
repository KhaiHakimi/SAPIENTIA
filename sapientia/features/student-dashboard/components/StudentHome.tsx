'use client';

import { useRequireStudent } from '@/features/auth/hooks/useSession';
import { StudentProgressProvider } from '../context/StudentProgressProvider';
import { StudentDashboard } from './StudentDashboard';

/** The board for the signed-in student; nothing renders until the session is read, and anyone else goes to /login. */
export function StudentHome() {
  const account = useRequireStudent();
  if (!account) return null;
  return (
    // Keyed by account, so a different student never inherits the previous one's quest ticks or battle wins.
    <StudentProgressProvider key={account.id} student={account.student} baseline={account.baseline}>
      <StudentDashboard />
    </StudentProgressProvider>
  );
}
