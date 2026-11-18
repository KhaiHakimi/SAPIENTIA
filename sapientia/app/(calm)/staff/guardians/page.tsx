import type { Metadata } from 'next';
import { GuardiansPage } from '@/features/guardians/components/GuardiansPage';

export const metadata: Metadata = { title: 'Sapientia • Penjaga' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Administrators: guardians, their links to pupils, and sign-in slips. The API refuses everyone else; the menu hides the link. */
export default function Guardians() {
  return <GuardiansPage />;
}
