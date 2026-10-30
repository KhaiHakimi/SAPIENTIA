import type { Metadata } from 'next';
import { CalendarPage } from '@/features/delivery/components/CalendarPage';

export const metadata: Metadata = { title: 'Sapientia • Kalendar' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Administrators enter holidays and replacement working days. The API refuses everyone else; the menu hides the link. */
export default function Page() {
  return <CalendarPage />;
}
