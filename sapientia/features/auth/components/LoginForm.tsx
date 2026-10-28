'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { SIGN_IN_DELAY_MS } from '../constants/login.constants';
import type { DemoAccount, LoginFieldErrors } from '../interfaces/account.interface';
import type { LoginMessages } from '../i18n/login-messages.interface';
import { accountName, checkLoginFields, findAccount } from '../services/auth.service';
import { sessionStore } from '../services/session.store';
import styles from '../styles/Login.module.css';
import { DemoAccounts } from './DemoAccounts';

/** Alerts keep what happened, not the words, so switching language re-translates an alert already on screen. */
type LoginAlert = { kind: 'error'; reason: 'badCredentials' } | { kind: 'ok'; reason: 'forgot' } | { kind: 'ok'; reason: 'filled'; who: string };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function alertText(alert: LoginAlert, text: LoginMessages): string {
  if (alert.reason === 'badCredentials') return text.badCredentials;
  if (alert.reason === 'forgot') return text.forgotInfo;
  return text.filled(alert.who);
}

/** Email and password form. A match is saved to the session store; LoginPage reacts to that and routes by role. */
export function LoginForm({ text }: { text: LoginMessages }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [alert, setAlert] = useState<LoginAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  // The fake sign-in waits; leaving the page during the wait must not update a component that is gone.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setAlert(null);
    const found = checkLoginFields(email, password);
    setErrors(found);
    if (found.email) return emailInput.current?.focus();
    if (found.password) return passwordInput.current?.focus();

    setLoading(true);
    await wait(SIGN_IN_DELAY_MS);
    if (!mounted.current) return;
    setLoading(false);

    const account = findAccount(email, password);
    if (!account) {
      setAlert({ kind: 'error', reason: 'badCredentials' });
      setPassword('');
      passwordInput.current?.focus();
      return;
    }
    sessionStore.set(account.id);
  };

  const fillDemoAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrors({});
    setAlert({ kind: 'ok', reason: 'filled', who: accountName(account) });
  };

  return (
    <>
      <div className={`${styles.alert} ${alert ? styles[alert.kind] : ''}`} role="alert" aria-live="assertive">
        {alert ? alertText(alert, text) : null}
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="login-email">{text.email}</label>
          <input
            ref={emailInput}
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder={text.emailPlaceholder}
            value={email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="login-email-hint"
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors(({ password: passwordError }) => ({ password: passwordError }));
            }}
          />
          <div id="login-email-hint" className={styles.hint}>
            {errors.email ? text.fieldErrors[errors.email] : ''}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="login-password">{text.password}</label>
          <div className={styles.control}>
            <input
              ref={passwordInput}
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              aria-invalid={Boolean(errors.password)}
              aria-describedby="login-password-hint"
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors(({ email: emailError }) => ({ email: emailError }));
              }}
            />
            <button type="button" className={styles.toggle} aria-controls="login-password" aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)}>
              {showPassword ? text.hide : text.show}
            </button>
          </div>
          <div id="login-password-hint" className={styles.hint}>
            {errors.password ? text.fieldErrors[errors.password] : ''}
          </div>
        </div>

        <div className={styles.row}>
          <button type="button" className={styles.linkButton} onClick={() => setAlert({ kind: 'ok', reason: 'forgot' })}>
            {text.forgot}
          </button>
        </div>

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading && <span className={styles.spinner} aria-hidden="true" />}
          <span>{loading ? text.submitting : text.submit}</span>
          <svg className={styles.submitArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </form>

      <p className={styles.note}>{text.note}</p>
      <DemoAccounts text={text} onUse={fillDemoAccount} />
    </>
  );
}
