import type { Metadata } from 'next';
import { SettingsPage } from '@/features/delivery/components/SettingsPage';

export const metadata: Metadata = { title: 'Sapientia • Waktu Bekerja' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Administrators set working hours, weekend and state. The API refuses everyone else; the menu hides the link. */
export default function Page() {
  return <SettingsPage />;
}
