'use client';

import { ChoosePasswordPage } from '@/features/students/components/ChoosePasswordPage';
import { useCurrentStudent } from '@/features/students/hooks/useCurrentStudent';
import { StudentProgressProvider } from '../context/StudentProgressProvider';
import { SAMPLE_BASELINE } from '../data/sample-student';
import { StudentDashboard } from './StudentDashboard';

/**
 * The board for the signed-in pupil (from the server session). A pupil still on their slip's password chooses their own
 * first; without a session the hook sends the browser to /login. Quests, timetable and progress are still sample data until
 * homework and the class timetable arrive (plan Sprint 12), so every pupil starts from the same sample baseline.
 */
export function StudentHome() {
  const { data } = useCurrentStudent();
  if (!data) return null;
  if (data.mustChangePassword) return <ChoosePasswordPage name={data.student.name} />;
  const { id, name, className } = data.student;
  return (
    // Keyed by pupil, so a different pupil never inherits the previous one's quest ticks or battle wins.
    <StudentProgressProvider key={id} student={{ name, className: className ?? '' }} baseline={SAMPLE_BASELINE}>
      <StudentDashboard />
    </StudentProgressProvider>
  );
}
