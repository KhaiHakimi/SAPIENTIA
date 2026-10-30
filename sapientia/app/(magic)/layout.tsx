import type { ReactNode } from 'react';
import { ThemeScope } from '@/shared/theme/ThemeScope';

/** Sign-in, accepting an invite and the student home use the magic-academy theme (plan D8); staff screens are in (calm). */
export default function MagicLayout({ children }: { children: ReactNode }) {
  return <ThemeScope scope="magic">{children}</ThemeScope>;
}
