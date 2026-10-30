import type { Metadata } from 'next';
import { LoginPage } from '@/features/auth/components/LoginPage';

export const metadata: Metadata = { title: 'Sapientia • Log Masuk' };

/** Sign-in against the mock accounts in features/auth/data until the real sign-in exists (plan Sprint 2). */
export default function Login() {
  return <LoginPage />;
}
