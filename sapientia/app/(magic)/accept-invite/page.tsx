import type { Metadata } from 'next';
import { AcceptInvitePage } from '@/features/auth/components/AcceptInvitePage';

export const metadata: Metadata = { title: 'Sapientia • Terima Jemputan', referrer: 'no-referrer' };

/** Set a password from an administrator's one-time invite link (plan Sprint 2). */
export default function AcceptInvite() {
  return <AcceptInvitePage />;
}
