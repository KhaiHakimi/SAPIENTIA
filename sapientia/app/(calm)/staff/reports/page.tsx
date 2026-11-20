import type { Metadata } from 'next';
import { ReportsPage } from '@/features/reports/components/ReportsPage';

export const metadata: Metadata = { title: 'Sapientia • Laporan Bulanan' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** The monthly principal report. Administrators only: the menu hides it from others and the API refuses them. */
export default function Page() {
  return <ReportsPage />;
}
