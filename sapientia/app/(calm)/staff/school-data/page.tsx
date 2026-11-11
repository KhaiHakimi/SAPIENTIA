import type { Metadata } from 'next';
import { SchoolDataPage } from '@/features/school-data/components/SchoolDataPage';

export const metadata: Metadata = { title: 'Sapientia • Data Sekolah' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Administrators keep the school's subjects, classes and task types. The API refuses changes from everyone else. */
export default function Page() {
  return <SchoolDataPage />;
}
