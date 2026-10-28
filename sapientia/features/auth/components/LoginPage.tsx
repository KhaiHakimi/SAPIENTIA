'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { toggleTheme } from '@/shared/theme/theme.store';
import { cinzel, inter } from '../constants/login-fonts';
import { OPEN_BOARD_DELAY_MS } from '../constants/login.constants';
import { useSession, useSignOut } from '../hooks/useSession';
import { LOGIN_MESSAGES } from '../i18n/login.messages';
import { accountName } from '../services/auth.service';
import styles from '../styles/Login.module.css';
import { AmbientMotes } from './AmbientMotes';
import { LoginForm } from './LoginForm';
import { LoginShowcase } from './LoginShowcase';

function Seal({ size, className }: { size: number; className: string }) {
  return (
    <span className={className}>
      <Image src="/brand/sapientia-logo.jpg" alt="" width={size} height={size} />
    </span>
  );
}

/**
 * The prototype's "Bilik Darjah" split login (prototypes/login, variant D). Once signed in, a student sees the access seal and
 * is taken to /student; a teacher sees the seal with a note that their board is not built yet, and can sign out.
 */
export function LoginPage() {
  const text = useMessages(LOGIN_MESSAGES);
  const { toggleLang } = useLanguage();
  const { account } = useSession();
  const signOut = useSignOut();
  const router = useRouter();

  useEffect(() => {
    if (account?.role !== 'student') return;
    router.prefetch('/student');
    const timer = setTimeout(() => router.replace('/student'), OPEN_BOARD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [account, router]);

  return (
    <div className={`${styles.page} ${cinzel.variable} ${inter.variable}`}>
      <AmbientMotes />
      <div className={styles.tools}>
        <button type="button" aria-label={text.switchLanguage} onClick={toggleLang}>
          BM | EN
        </button>
        <button type="button" onClick={toggleTheme}>
          {text.theme}
        </button>
      </div>

      <div className={`${styles.stage} ${account ? styles.opening : ''}`}>
        <LoginShowcase text={text} />

        <main className={styles.pane} inert={Boolean(account)}>
          <div className={styles.card}>
            <span className={`${styles.corner} ${styles.topLeft}`} aria-hidden="true" />
            <span className={`${styles.corner} ${styles.topRight}`} aria-hidden="true" />
            <span className={`${styles.corner} ${styles.bottomLeft}`} aria-hidden="true" />
            <span className={`${styles.corner} ${styles.bottomRight}`} aria-hidden="true" />

            <div className={styles.cardHeader}>
              <Seal size={48} className={styles.cardSeal} />
              <div>
                <h2>{text.title}</h2>
                <p>{text.subtitle}</p>
              </div>
            </div>

            <LoginForm text={text} />

            <p className={styles.demoBadge}>{text.demoBadge}</p>
          </div>
        </main>

        {account && (
          <div className={styles.banner} role="status">
            <Seal size={76} className={styles.bannerSeal} />
            <h2>{text.successTitle}</h2>
            {account.role === 'student' ? (
              <p>{text.studentOpening(accountName(account))}</p>
            ) : (
              <>
                <p>
                  {text.teacherWelcome(accountName(account))} {text.teacherNoBoard}
                </p>
                <button type="button" className={styles.submit} onClick={signOut} autoFocus>
                  {text.signOut}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
