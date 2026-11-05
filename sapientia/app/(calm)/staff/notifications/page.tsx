import type { Metadata } from 'next';
import { NotificationsPage } from '@/features/notifications/components/NotificationsPage';

export const metadata: Metadata = { title: 'Sapientia • Pemberitahuan' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Every signed-in staff member manages their own email and push choices here, and can install the app. */
export default function Page() {
  return <NotificationsPage />;
}
