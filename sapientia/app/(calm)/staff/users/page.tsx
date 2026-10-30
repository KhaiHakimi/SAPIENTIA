import type { Metadata } from 'next';
import { UsersPage } from '@/features/users/components/UsersPage';

export const metadata: Metadata = { title: 'Sapientia • Pengguna' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Administrators: user list and invites. The API refuses everyone else; the menu hides the link. */
export default function Users() {
  return <UsersPage />;
}
