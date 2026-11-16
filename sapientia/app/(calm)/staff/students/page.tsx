import type { Metadata } from 'next';
import { StudentsPage } from '@/features/students/components/StudentsPage';

export const metadata: Metadata = { title: 'Sapientia • Murid' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Administrators: pupils, class lists and sign-in slips. The API refuses everyone else; the menu hides the link. */
export default function Students() {
  return <StudentsPage />;
}
