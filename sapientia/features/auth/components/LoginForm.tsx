'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CurrentGuardian } from '@/features/guardians/interfaces/guardian.interface';
import { signInGuardian } from '@/features/guardians/services/guardian-auth.client';
import type { CurrentStudent } from '@/features/students/interfaces/student.interface';
import { signInStudent } from '@/features/students/services/student-auth.client';
import { ApiError } from '@/shared/api/api-client';
import type { LoginFieldErrors } from '../interfaces/account.interface';
import type { SessionUser } from '../interfaces/session-user.interface';
import type { LoginMessages } from '../i18n/login-messages.interface';
import { checkLoginFields, isEmailIdentifier, isGuardianIdentifier } from '../services/auth.service';
import { signInStaff } from '../services/staff-auth.client';
import styles from '../styles/Login.module.css';
import { DemoAccounts, type DemoChoice } from './DemoAccounts';

/** Alerts keep what happened, not the words, so switching language re-translates an alert already on screen. */
type LoginAlert =
  | { kind: 'error'; reason: 'badCredentials' | 'rateLimited' | 'networkError' }
  | { kind: 'ok'; reason: 'forgot' }
  | { kind: 'ok'; reason: 'filled'; who: string };

function alertText(alert: LoginAlert, text: LoginMessages): string {
  if (alert.kind === 'error') return text[alert.reason];
  if (alert.reason === 'forgot') return text.forgotInfo;
  return text.filled(alert.who);
}

interface LoginFormProps {
  text: LoginMessages;
  onStaffSignedIn: (user: SessionUser) => void;
  onStudentSignedIn: (current: CurrentStudent) => void;
  onGuardianSignedIn: (current: CurrentGuardian) => void;
}

/**
 * One form for everyone: an email signs in a member of staff, a "penjaga." username a guardian, anything else a pupil (both
 * usernames come from printed slips). Each goes to the API, which sets an HttpOnly cookie; LoginPage then opens the right page.
 */
export function LoginForm({ text, onStaffSignedIn, onStudentSignedIn, onGuardianSignedIn }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [alert, setAlert] = useState<LoginAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const identifierInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  // Leaving the page while the request is out must not update a component that is gone.
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
    const found = checkLoginFields(identifier, password);
    setErrors(found);
    if (found.identifier) return identifierInput.current?.focus();
    if (found.password) return passwordInput.current?.focus();

    setLoading(true);
    const trimmed = identifier.trim();
    try {
      if (isEmailIdentifier(trimmed)) {
        const user = await signInStaff({ email: trimmed, password });
        if (!mounted.current) return;
        // Next.js keeps this page alive, hidden, while the board is open; the password must not stay in it.
        setPassword('');
        onStaffSignedIn(user);
      } else if (isGuardianIdentifier(trimmed)) {
        const current = await signInGuardian({ username: trimmed, password });
        if (!mounted.current) return;
        setPassword('');
        onGuardianSignedIn(current);
      } else {
        const current = await signInStudent({ username: trimmed, password });
        if (!mounted.current) return;
        setPassword('');
        onStudentSignedIn(current);
      }
    } catch (error) {
      if (!mounted.current) return;
      const reason = !(error instanceof ApiError) || error.code === 'network' ? 'networkError'
        : error.code === 'rate_limited' ? 'rateLimited' : 'badCredentials';
      setAlert({ kind: 'error', reason });
      setPassword('');
      passwordInput.current?.focus();
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const fillDemoAccount = (account: DemoChoice) => {
    setIdentifier(account.username);
    setPassword('');
    setErrors({});
    setAlert({ kind: 'ok', reason: 'filled', who: account.name });
    passwordInput.current?.focus();
  };

  return (
    <>
      <div className={`${styles.alert} ${alert ? styles[alert.kind] : ''}`} role="alert" aria-live="assertive">
        {alert ? alertText(alert, text) : null}
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="login-identifier">{text.identifier}</label>
          <input
            ref={identifierInput}
            id="login-identifier"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={text.identifierPlaceholder}
            value={identifier}
            aria-invalid={Boolean(errors.identifier)}
            aria-describedby="login-identifier-hint"
            onChange={(event) => {
              setIdentifier(event.target.value);
              setErrors(({ password: passwordError }) => ({ password: passwordError }));
            }}
          />
          <div id="login-identifier-hint" className={styles.hint}>
            {errors.identifier ? text.fieldErrors[errors.identifier] : ''}
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
                setErrors(({ identifier: identifierError }) => ({ identifier: identifierError }));
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
