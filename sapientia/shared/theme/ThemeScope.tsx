import type { ReactNode } from 'react';
import type { ThemeScopeName } from '@/shared/interfaces/theme-scope.interface';
import styles from './ThemeScope.module.css';

/** Sets data-theme-scope for a route group's layout; the scope's tokens in app/globals.css then apply to everything inside. */
export function ThemeScope({ scope, children }: { scope: ThemeScopeName; children: ReactNode }) {
  return (
    <div data-theme-scope={scope} className={styles.scope}>
      {children}
    </div>
  );
}
