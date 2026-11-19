'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { signOutStaff } from '@/features/auth/services/staff-auth.client';
import { SecurityPage } from '@/features/mfa/components/SecurityPage';
import { PUSH_OFF_DEADLINE_MS } from '@/features/notifications/constants/notification.constants';
import { disablePush } from '@/features/notifications/services/push-device.client';
import { ApiError } from '@/shared/api/api-client';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { startInstallListener } from '@/shared/pwa/install-prompt.store';
import { registerServiceWorker } from '@/shared/pwa/service-worker.client';
import { withDeadline } from '@/shared/services/deadline.service';
import { openSignInPage } from '@/shared/services/sign-in-page.service';
import { toggleTheme } from '@/shared/theme/theme.store';
import { STAFF_NAV } from '../constants/staff-nav.constants';
import { StaffUserContext, useCurrentUserQuery } from '../hooks/useStaffUser';
import { STAFF_MESSAGES } from '../i18n/staff.messages';
import styles from '../styles/StaffShell.module.css';

/** Frame for every staff page: who is signed in, the menu for their role, language, theme and sign-out. */
export function StaffShell({ children }: { children: ReactNode }) {
  const text = useMessages(STAFF_MESSAGES);
  const { toggleLang } = useLanguage();
  const pathname = usePathname();
  const me = useCurrentUserQuery();
  const [signingOut, setSigningOut] = useState(false);

  const signedOut = me.error instanceof ApiError && me.error.status === 401;
  useEffect(() => {
    if (signedOut) openSignInPage();
  }, [signedOut]);

  // The service worker shows push notifications; the install listener must be in place before the browser offers to install.
  useEffect(() => {
    startInstallListener();
    void registerServiceWorker();
  }, []);

  const signOut = async () => {
    setSigningOut(true);
    try {
      // A shared staffroom PC should not keep showing this person's task notices after they sign out.
      await withDeadline(disablePush(), PUSH_OFF_DEADLINE_MS);
    } catch (error) {
      console.error('Could not turn off push for this device', error);
    }
    try {
      await signOutStaff();
    } catch (error) {
      // The cookie may still be set if the call failed; the login page will show the account again, which is honest.
      console.error('Sign-out request failed', error);
    }
    openSignInPage();
  };

  if (!me.data) {
    return (
      <div className={calm.page}>
        {me.isError && !signedOut ? (
          <div className={`${calm.alert} ${calm.alertError}`} role="alert">
            {text.loadFailed}{' '}
            <button type="button" className={calm.linkButton} onClick={() => me.refetch()}>
              {text.retry}
            </button>
          </div>
        ) : (
          <p className={calm.loading} role="status">{text.loading}</p>
        )}
      </div>
    );
  }

  const user = me.data;
  // The board is /staff itself; a task page (/staff/tasks/...) belongs to no menu item except New Task's exact path.
  const isCurrent = (href: string) => (href === '/staff' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <StaffUserContext.Provider value={user}>
      <a className={styles.skip} href="#staff-main">{text.skipToContent}</a>
      <header className={styles.header}>
        <div className={styles.brand}>
          <strong>Sapientia</strong>
          <span className={calm.muted}>{user.schoolName}</span>
        </div>
        <nav aria-label={text.mainNav} className={styles.nav}>
          {!user.mfaSetupRequired && STAFF_NAV.filter((item) => item.roles.includes(user.role)).map((item) => (
            <Link key={item.key} href={item.href} className={styles.navLink} aria-current={isCurrent(item.href) ? 'page' : undefined}>
              {text.nav[item.key]}
            </Link>
          ))}
        </nav>
        <div className={styles.tools}>
          <span className={styles.who}>
            {user.name} <span className={calm.badge}>{text.roles[user.role]}</span>
          </span>
          <button type="button" className={`${calm.button} ${calm.small}`} onClick={toggleLang}>
            BM | EN <span className="sr-only">{text.switchLanguage}</span>
          </button>
          <button type="button" className={`${calm.button} ${calm.small}`} onClick={toggleTheme}>
            {text.theme}
          </button>
          <button type="button" className={`${calm.button} ${calm.small}`} onClick={signOut} disabled={signingOut}>
            {signingOut ? text.signingOut : text.signOut}
          </button>
        </div>
      </header>
      <main id="staff-main" className={calm.page}>
        {/* The school requires two-step sign-in for administrators: nothing else opens until it is set up. */}
        {user.mfaSetupRequired ? <SecurityPage required /> : children}
      </main>
    </StaffUserContext.Provider>
  );
}
