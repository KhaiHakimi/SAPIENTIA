import type { Metadata } from 'next';
import { MeetingsPage } from '@/features/meetings/components/MeetingsPage';

export const metadata: Metadata = { title: 'Sapientia • Pertemuan' };

// Waits on the staff shell's sign-in check; see app/(calm)/staff/layout.tsx.
export const instant = false;

/** Guardians' meeting requests to the signed-in teacher, once they have reached them in working hours. */
export default function Meetings() {
  return <MeetingsPage />;
}
