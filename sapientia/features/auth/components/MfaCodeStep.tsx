'use client';

import { useRef, useState, type FormEvent } from 'react';
import { MFA_MESSAGES } from '@/features/mfa/i18n/mfa.messages';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError } from '@/shared/api/api-error.messages';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { SessionUser } from '../interfaces/session-user.interface';
import { finishStaffMfa } from '../services/staff-auth.client';
import styles from '../styles/Login.module.css';

interface MfaCodeStepProps {
  onSignedIn: (user: SessionUser) => void;
  /** Back to the password, also when the five minutes for the code have run out. */
  onBack: () => void;
}

/** The second step of a staff sign-in: a 6-digit code from the authenticator app, or one recovery code. */
export function MfaCodeStep({ onSignedIn, onBack }: MfaCodeStepProps) {
  const text = useMessages(MFA_MESSAGES);
  const { lang } = useLanguage();
  const [useRecovery, setUseRecovery] = useState(false);
  const [value, setValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || value.trim() === '') return;
    setLoading(true);
    setMessage(null);
    try {
      const user = await finishStaffMfa(useRecovery ? { recoveryCode: value } : { code: value });
      setValue('');
      onSignedIn(user);
    } catch (error) {
      setValue('');
      if (error instanceof ApiError && error.status === 401) {
        setExpired(true);
        setMessage(text.expired);
      } else {
        const reason = error instanceof ApiError ? error.fields.code ?? error.fields.recoveryCode : undefined;
        setMessage(reason ? (text.fieldErrors[reason] ?? describeApiError(error, lang)) : describeApiError(error, lang));
        input.current?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`${styles.alert} ${message ? styles.error : ''}`} role="alert" aria-live="assertive">{message}</div>
      <h2 className={styles.stepTitle}>{text.signInTitle}</h2>
      {expired ? (
        <button type="button" className={styles.submit} onClick={onBack}><span>{text.back}</span></button>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="login-code">{useRecovery ? text.recoveryCode : text.code}</label>
            <input ref={input} id="login-code" name="code" type="text" autoFocus
              inputMode={useRecovery ? 'text' : 'numeric'} autoComplete={useRecovery ? 'off' : 'one-time-code'}
              autoCapitalize="none" spellCheck={false} maxLength={useRecovery ? 32 : 7} value={value}
              onChange={(event) => setValue(event.target.value)} aria-describedby={useRecovery ? undefined : 'login-code-help'} />
            {!useRecovery && <p id="login-code-help" className={styles.stepHelp}>{text.signInIntro}</p>}
          </div>
          <div className={`${styles.row} ${styles.rowSpread}`}>
            <button type="button" className={styles.linkButton} onClick={() => {
              setUseRecovery((recovery) => !recovery);
              setValue('');
              setMessage(null);
            }}>
              {useRecovery ? text.useApp : text.useRecovery}
            </button>
            <button type="button" className={styles.linkButton} onClick={onBack}>{text.back}</button>
          </div>
          <button type="submit" className={styles.submit} disabled={loading}>
            {loading && <span className={styles.spinner} aria-hidden="true" />}
            <span>{loading ? text.verifying : text.verify}</span>
          </button>
        </form>
      )}
    </>
  );
}
