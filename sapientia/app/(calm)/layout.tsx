import type { ReactNode } from 'react';
import { QueryProvider } from '@/shared/api/QueryProvider';
import { ThemeScope } from '@/shared/theme/ThemeScope';

/** Teacher, sender and administrator screens use the calm scope (plan D8): plain, dense and high contrast. */
export default function CalmLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeScope scope="calm">
      <QueryProvider>{children}</QueryProvider>
    </ThemeScope>
  );
}
