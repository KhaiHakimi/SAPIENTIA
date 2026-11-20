import type { Metadata } from 'next';
import { SecurityPage } from '@/features/mfa/components/SecurityPage';

export const metadata: Metadata = { title: 'Sapientia • Keselamatan' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Any member of staff: two-step sign-in for their own account; administrators also set the school's rule. */
export default function Security() {
  return <SecurityPage />;
}
