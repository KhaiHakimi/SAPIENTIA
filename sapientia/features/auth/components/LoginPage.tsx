'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { CurrentGuardian } from '@/features/guardians/interfaces/guardian.interface';
import type { CurrentStudent } from '@/features/students/interfaces/student.interface';
import { useVisitKey } from '@/shared/hooks/useVisitKey';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { toggleTheme } from '@/shared/theme/theme.store';
import { cinzel, inter } from '../constants/login-fonts';
import { OPEN_BOARD_DELAY_MS } from '../constants/login.constants';
import type { SessionUser } from '../interfaces/session-user.interface';
import { LOGIN_MESSAGES } from '../i18n/login.messages';
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
 * The prototype's "Bilik Darjah" split login (prototypes/login, variant D). Once signed in, everyone sees the access seal; a
 * pupil is then taken to /student, a guardian to /guardian (each asks for a password of their own while still on the slip's)
 * and staff to /staff.
 *
 * Every visit starts fresh: a kept-alive copy still "signed in" would open the board again by itself on return, and the board,
 * finding no session, would send it back here (a sign-in, sign-out loop). It would also show the last person's email.
 */
export function LoginPage() {
  return <LoginScreen key={useVisitKey()} />;
}

function LoginScreen() {
  const text = useMessages(LOGIN_MESSAGES);
  const { toggleLang } = useLanguage();
  const [staff, setStaff] = useState<SessionUser | null>(null);
  const [pupil, setPupil] = useState<CurrentStudent | null>(null);
  const [guardian, setGuardian] = useState<CurrentGuardian | null>(null);
  const router = useRouter();
  const destination = staff ? '/staff' : pupil ? '/student' : guardian ? '/guardian' : null;
  const signedIn = Boolean(destination);

  useEffect(() => {
    if (!destination) return;
    router.prefetch(destination);
    const timer = setTimeout(() => router.replace(destination), OPEN_BOARD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [destination, router]);

  return (
    <div className={`${styles.page} ${cinzel.variable} ${inter.variable}`}>
      <AmbientMotes />
      <div className={styles.tools}>
        <button type="button" onClick={toggleLang}>
          BM | EN <span className="sr-only">{text.switchLanguage}</span>
        </button>
        <button type="button" onClick={toggleTheme}>
          {text.theme}
        </button>
      </div>

      <div className={`${styles.stage} ${signedIn ? styles.opening : ''}`}>
        <LoginShowcase text={text} />

        <main className={styles.pane} inert={signedIn}>
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

            <LoginForm text={text} onStaffSignedIn={setStaff} onStudentSignedIn={setPupil} onGuardianSignedIn={setGuardian} />

            <p className={styles.demoBadge}>{text.demoBadge}</p>
          </div>
        </main>

        {signedIn && (
          <div className={styles.banner} role="status">
            <Seal size={76} className={styles.bannerSeal} />
            <h2>{text.successTitle}</h2>
            <p>
              {staff ? text.staffOpening(staff.name)
                : pupil ? text.studentOpening(pupil.student.name)
                  : guardian ? text.guardianOpening(guardian.guardian.name) : null}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
