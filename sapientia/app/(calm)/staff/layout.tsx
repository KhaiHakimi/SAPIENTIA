import type { ReactNode } from 'react';
import { StaffShell } from '@/features/staff/components/StaffShell';

/**
 * Staff pages render only after the browser has confirmed who is signed in, so each page under here exports
 * `instant = false`: entering them may wait on that check. (A false on this layout does not exempt the pages.)
 */
export default function StaffLayout({ children }: { children: ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
