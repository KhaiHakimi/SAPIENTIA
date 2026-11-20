import type { Metadata } from 'next';
import { MaterialsPage } from '@/features/materials/components/MaterialsPage';

export const metadata: Metadata = { title: 'Sapientia • Bank Bahan' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** The school's shared material bank, for every member of staff. */
export default function Page() {
  return <MaterialsPage />;
}
