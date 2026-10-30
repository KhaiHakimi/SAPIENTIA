'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { toggleTheme } from '@/shared/theme/theme.store';
import { OPEN_BOARD_DELAY_MS } from '../constants/login.constants';
import { cinzel, inter } from '../constants/login-fonts';
import { ACCEPT_INVITE_MESSAGES } from '../i18n/accept-invite.messages';
import type { SessionUser } from '../interfaces/session-user.interface';
import { acceptStaffInvite } from '../services/staff-auth.client';
import styles from '../styles/Login.module.css';

const subscribeNothing = () => () => {};
/** The token travels in the URL fragment, which browsers never send to servers or in Referer headers. */
const readToken = () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';

/** Sets the password from a one-time invite link, then opens the staff board (magic scope, like sign-in). */
export function AcceptInvitePage() {
  const text = useMessages(ACCEPT_INVITE_MESSAGES);
  const { lang, toggleLang } = useLanguage();
  const router = useRouter();
  const token = useSyncExternalStore(subscribeNothing, readToken, () => null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => router.replace('/staff'), OPEN_BOARD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [user, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !token) return;
    setFailure(null);
    if (password !== confirm) {
      setFields({ confirm: 'mismatch' });
      return;
    }
    setFields({});
    setBusy(true);
    try {
      setUser(await acceptStaffInvite({ token, password }));
      // Drop the token from the address bar and history now that it is spent.
      window.history.replaceState(null, '', window.location.pathname);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'validation' && error.fields.password) {
        setFields({ password: error.fields.password });
        passwordInput.current?.focus();
      } else {
        setFailure(error instanceof ApiError && error.code === 'not_found' ? text.invalidLink : describeApiError(error, lang));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${styles.page} ${cinzel.variable} ${inter.variable}`}>
      <div className={styles.tools}>
        <button type="button" aria-label={text.switchLanguage} onClick={toggleLang}>BM | EN</button>
        <button type="button" onClick={toggleTheme}>{text.theme}</button>
      </div>
      <main className={styles.pane}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>{text.title}</h2>
              <p>{text.subtitle}</p>
            </div>
          </div>

          {user ? (
            <div className={`${styles.alert} ${styles.ok}`} role="status">{text.done(user.name)}</div>
          ) : token === '' ? (
            <div className={`${styles.alert} ${styles.error}`} role="alert">{text.missingToken}</div>
          ) : (
            <>
              <div className={`${styles.alert} ${failure ? styles.error : ''}`} role="alert">{failure}</div>
              <form onSubmit={onSubmit} noValidate>
                <div className={styles.field}>
                  <label htmlFor="invite-password">{text.password}</label>
                  <div className={styles.control}>
                    <input ref={passwordInput} id="invite-password" type={show ? 'text' : 'password'} autoComplete="new-password"
                      value={password} onChange={(event) => setPassword(event.target.value)}
                      aria-invalid={Boolean(fields.password)} aria-describedby="invite-password-help invite-password-error" />
                    <button type="button" className={styles.toggle} aria-controls="invite-password" aria-pressed={show}
                      onClick={() => setShow((shown) => !shown)}>
                      {show ? text.hide : text.show}
                    </button>
                  </div>
                  <div id="invite-password-help" className={styles.note}>{text.passwordHelp}</div>
                  <div id="invite-password-error" className={styles.hint}>{describeFieldError(fields.password, lang)}</div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="invite-confirm">{text.confirm}</label>
                  <input id="invite-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm}
                    onChange={(event) => setConfirm(event.target.value)} aria-invalid={Boolean(fields.confirm)} aria-describedby="invite-confirm-error" />
                  <div id="invite-confirm-error" className={styles.hint}>{describeFieldError(fields.confirm, lang)}</div>
                </div>
                <button type="submit" className={styles.submit} disabled={busy || token === null}>
                  {busy && <span className={styles.spinner} aria-hidden="true" />}
                  <span>{busy ? text.submitting : text.submit}</span>
                </button>
              </form>
            </>
          )}
          <p className={styles.note}><Link href="/login">{text.backToLogin}</Link></p>
        </div>
      </main>
    </div>
  );
}
