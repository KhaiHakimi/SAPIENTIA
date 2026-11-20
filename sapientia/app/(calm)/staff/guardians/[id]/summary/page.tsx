import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GuardianSummaryPage } from '@/features/guardians/components/GuardianSummaryPage';

export const metadata: Metadata = { title: 'Sapientia • Ringkasan penjaga' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Administrators: the printable summary for one guardian. The API refuses everyone else. The id is read in Suspense. */
export default function Page({ params }: PageProps<'/staff/guardians/[id]/summary'>) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => <GuardianSummaryPage id={id} />)}
    </Suspense>
  );
}
