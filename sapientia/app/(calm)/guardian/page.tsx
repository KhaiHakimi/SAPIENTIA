import type { Metadata } from 'next';
import { GuardianHome } from '@/features/guardians/components/GuardianHome';

export const metadata: Metadata = { title: 'Sapientia • Penjaga' };

/** The guardian's read-only view of their linked children (plan Phase 4, Sprint 13). Calm theme (plan D8). */
export default function GuardianPage() {
  return <GuardianHome />;
}
