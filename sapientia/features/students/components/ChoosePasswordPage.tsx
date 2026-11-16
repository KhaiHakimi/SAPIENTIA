'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { cinzel, inter } from '@/features/auth/constants/login-fonts';
import styles from '@/features/auth/styles/Login.module.css';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { toggleTheme } from '@/shared/theme/theme.store';
import { useStudentSignOut } from '../hooks/useCurrentStudent';
import { CHOOSE_PASSWORD_MESSAGES } from '../i18n/choose-password.messages';
import { changeStudentPassword, CURRENT_STUDENT_KEY } from '../services/student-auth.client';

type Field = 'currentPassword' | 'newPassword' | 'confirm';

/**
 * Shown instead of the board while a pupil still has the slip's password (story S11-2). Same look as sign-in. On success the
 * pupil query refreshes and the board opens.
 */
export function ChoosePasswordPage({ name }: { name: string }) {
  const text = useMessages(CHOOSE_PASSWORD_MESSAGES);
  const { lang, toggleLang } = useLanguage();
  const queryClient = useQueryClient();
  const signOut = useStudentSignOut();
  const [values, setValues] = useState<Record<Field, string>>({ currentPassword: '', newPassword: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [fields, setFields] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputs = {
    currentPassword: useRef<HTMLInputElement>(null),
    newPassword: useRef<HTMLInputElement>(null),
    confirm: useRef<HTMLInputElement>(null),
  };

  const fieldText = (code: string | undefined) => (code ? (text.fieldErrors[code] ?? describeFieldError(code, lang)) : '');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setFailure(null);
    if (values.newPassword !== values.confirm) {
      setFields({ confirm: 'mismatch' });
      inputs.confirm.current?.focus();
      return;
    }
    setFields({});
    setBusy(true);
    try {
      await changeStudentPassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      await queryClient.invalidateQueries({ queryKey: CURRENT_STUDENT_KEY });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'validation') {
        const found = error.fields as Partial<Record<Field, string>>;
        setFields(found);
        const first = (['currentPassword', 'newPassword'] as const).find((field) => found[field]);
        if (first) inputs[first].current?.focus();
      } else {
        setFailure(describeApiError(error, lang));
      }
    } finally {
      setBusy(false);
    }
  };

  const input = (field: Field, label: string, autoComplete: string, help?: string) => (
    <div className={styles.field}>
      <label htmlFor={`choose-${field}`}>{label}</label>
      <input ref={inputs[field]} id={`choose-${field}`} type={show ? 'text' : 'password'} autoComplete={autoComplete}
        value={values[field]} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
        aria-invalid={Boolean(fields[field])}
        aria-describedby={`${help ? `choose-${field}-help ` : ''}choose-${field}-error`} />
      {help && <div id={`choose-${field}-help`} className={styles.note}>{help}</div>}
      <div id={`choose-${field}-error`} className={styles.hint}>{fieldText(fields[field])}</div>
    </div>
  );

  return (
    <div className={`${styles.page} ${cinzel.variable} ${inter.variable}`}>
      <div className={styles.tools}>
        <button type="button" onClick={toggleLang}>BM | EN <span className="sr-only">{text.switchLanguage}</span></button>
        <button type="button" onClick={toggleTheme}>{text.theme}</button>
      </div>
      <main className={styles.pane}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>{text.title}</h2>
              <p>{text.subtitle(name)}</p>
            </div>
          </div>
          <div className={`${styles.alert} ${failure ? styles.error : ''}`} role="alert">{failure}</div>
          <form onSubmit={onSubmit} noValidate>
            {input('currentPassword', text.currentPassword, 'current-password', text.currentHelp)}
            {input('newPassword', text.newPassword, 'new-password', text.newHelp)}
            {input('confirm', text.confirm, 'new-password')}
            <div className={styles.row}>
              <button type="button" className={styles.linkButton} aria-pressed={show} onClick={() => setShow((shown) => !shown)}>
                {show ? text.hide : text.show}
              </button>
            </div>
            <button type="submit" className={styles.submit} disabled={busy}>
              {busy && <span className={styles.spinner} aria-hidden="true" />}
              <span>{busy ? text.submitting : text.submit}</span>
            </button>
          </form>
          <p className={styles.note}>
            <button type="button" className={styles.linkButton} onClick={() => void signOut()}>{text.signOut}</button>
          </p>
        </div>
      </main>
    </div>
  );
}
