import type { Metadata } from 'next';
import { ReliefPage } from '@/features/relief/components/ReliefPage';

export const metadata: Metadata = { title: 'Sapientia • Guru Ganti' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Everyone sees the classes they cover for a colleague; administrators also arrange relief. The API enforces both. */
export default function Page() {
  return <ReliefPage />;
}
