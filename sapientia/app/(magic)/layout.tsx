import type { ReactNode } from 'react';
import { ThemeScope } from '@/shared/theme/ThemeScope';

/** Sign-in and the student home use the magic-academy theme (plan D8). Teacher and admin screens will get a (calm) group. */
export default function MagicLayout({ children }: { children: ReactNode }) {
  return <ThemeScope scope="magic">{children}</ThemeScope>;
}
