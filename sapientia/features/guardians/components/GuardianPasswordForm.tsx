'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage } from '@/shared/i18n/useLanguage';
import type { GuardianViewMessages } from '../i18n/guardian-view-messages.interface';
import { changeGuardianPassword, CURRENT_GUARDIAN_KEY } from '../services/guardian-auth.client';

type Field = 'currentPassword' | 'newPassword' | 'confirm';

/**
 * Shown instead of the view while a guardian still has the slip's password (story S13-3). On success the guardian query
 * refreshes and the view opens.
 */
export function GuardianPasswordForm({ text, name }: { text: GuardianViewMessages; name: string }) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
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
      await changeGuardianPassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      await queryClient.invalidateQueries({ queryKey: CURRENT_GUARDIAN_KEY });
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
    <div className={calm.field}>
      <label className={calm.label} htmlFor={`guardian-${field}`}>{label}</label>
      <input ref={inputs[field]} id={`guardian-${field}`} className={calm.input} type={show ? 'text' : 'password'} autoComplete={autoComplete}
        value={values[field]} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
        aria-invalid={Boolean(fields[field])}
        aria-describedby={`${help ? `guardian-${field}-help ` : ''}guardian-${field}-error`} />
      {help && <div id={`guardian-${field}-help`} className={calm.help}>{help}</div>}
      <div id={`guardian-${field}-error`} className={calm.fieldError}>{fieldText(fields[field])}</div>
    </div>
  );

  return (
    <section className={calm.card} aria-labelledby="guardian-password-title">
      <h1 id="guardian-password-title">{text.chooseTitle}</h1>
      <p>{text.chooseIntro(name)}</p>
      {failure && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{failure}</div>}
      <form onSubmit={onSubmit} noValidate>
        {input('currentPassword', text.currentPassword, 'current-password', text.currentHelp)}
        {input('newPassword', text.newPassword, 'new-password', text.newHelp)}
        {input('confirm', text.confirm, 'new-password')}
        <div className={calm.row}>
          <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={busy}>{busy ? text.submitting : text.submit}</button>
          <button type="button" className={calm.linkButton} aria-pressed={show} onClick={() => setShow((shown) => !shown)}>
            {show ? text.hide : text.show}
          </button>
        </div>
      </form>
    </section>
  );
}
