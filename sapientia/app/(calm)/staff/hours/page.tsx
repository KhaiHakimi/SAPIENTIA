import type { Metadata } from 'next';
import { HoursPage } from '@/features/hours/components/HoursPage';

export const metadata: Metadata = { title: 'Sapientia • Log Jam Peribadi' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Each person's own private hours log. The API serves only the caller's own entries. */
export default function Page() {
  return <HoursPage />;
}
