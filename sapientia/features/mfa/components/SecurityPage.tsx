'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useStaffUser, CURRENT_USER_KEY } from '@/features/staff/hooks/useStaffUser';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import { ApiTokensSection } from '@/features/mcp/components/ApiTokensSection';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { MFA_MESSAGES } from '../i18n/mfa.messages';
import type { MfaMessages } from '../i18n/mfa-messages.interface';
import type { MfaSetup } from '../interfaces/mfa.interface';
import {
  confirmMfaSetup,
  disableMfa,
  fetchMfaStatus,
  MFA_STATUS_KEY,
  replaceRecoveryCodes,
  setAdminMfaRequirement,
  startMfaSetup,
} from '../services/mfa.client';
import styles from '../styles/Mfa.module.css';

/** Reads the field reason from a failed request, worded for these screens when we have the words. */
function useFieldText(text: MfaMessages) {
  const { lang } = useLanguage();
  return (error: unknown, field: string): string | undefined => {
    const code = error instanceof ApiError ? error.fields[field] : undefined;
    return code ? (text.fieldErrors[code] ?? describeFieldError(code, lang)) : undefined;
  };
}

/**
 * Staff: two-step sign-in (plan gate G6). Any member of staff may turn it on; administrators also choose whether the school
 * requires it for every administrator. With `required`, this is the only page an administrator sees until it is set up.
 */
export function SecurityPage({ required = false }: { required?: boolean }) {
  const text = useMessages(MFA_MESSAGES);
  const { lang } = useLanguage();
  const user = useStaffUser();
  const status = useQuery({ queryKey: MFA_STATUS_KEY, queryFn: fetchMfaStatus });

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{required ? text.requiredTitle : text.title}</h1>
          <p>{required ? text.requiredIntro : text.intro}</p>
        </div>
      </div>
      {status.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : status.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(status.error, lang)}</div>
      ) : !status.data.available ? (
        <div className={`${calm.alert} ${calm.alertInfo}`} role="status">{text.unavailable}</div>
      ) : (
        <div className={calm.grid2}>
          <section className={calm.card} aria-labelledby="mfa-title">
            <h2 id="mfa-title">{status.data.enabled ? text.manageTitle : text.startTitle}</h2>
            <p className={styles.status}>{status.data.enabled ? text.statusOn(status.data.recoveryCodesLeft) : text.statusOff}</p>
            {status.data.enabled ? <Manage text={text} /> : <SetupFlow text={text} />}
          </section>
          {user.role === 'admin' && !required && (
            <AdminRequirement text={text} required={status.data.requiredForAdmins} />
          )}
          {!required && <ApiTokensSection />}
        </div>
      )}
    </>
  );
}

/** Password, then the key for the app, then the first code; the recovery codes come last and are shown once. */
function SetupFlow({ text }: { text: MfaMessages }) {
  const queryClient = useQueryClient();
  const fieldText = useFieldText(text);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const start = useMutation({
    mutationFn: () => startMfaSetup(password),
    onSuccess: (created) => {
      setPassword('');
      setSetup(created);
    },
  });
  const confirm = useMutation({ mutationFn: () => confirmMfaSetup(code), onSuccess: (result) => setRecoveryCodes(result.recoveryCodes) });
  const finish = async () => {
    await queryClient.invalidateQueries({ queryKey: MFA_STATUS_KEY });
    await queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY });
  };

  if (recoveryCodes) return <RecoveryCodes text={text} codes={recoveryCodes} onDone={() => void finish()} />;

  if (setup) {
    const codeError = fieldText(confirm.error, 'code');
    const onConfirm = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      confirm.mutate();
    };
    return (
      <form onSubmit={onConfirm} noValidate>
        <h3>{text.keyTitle}</h3>
        <p className={calm.help}>{text.keyHelp}</p>
        <p className={calm.label}>{text.keyLabel}</p>
        <p className={styles.key}><code>{setup.key}</code></p>
        <p><a href={setup.otpauthUri}>{text.openInApp}</a></p>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="mfa-code">{text.code}</label>
          <input id="mfa-code" className={`${calm.input} ${styles.codeInput}`} inputMode="numeric" autoComplete="one-time-code" maxLength={7}
            value={code} onChange={(event) => setCode(event.target.value)} aria-invalid={codeError ? true : undefined}
            aria-describedby={codeError ? 'mfa-code-error' : 'mfa-code-help'} />
          {codeError
            ? <p id="mfa-code-error" className={calm.fieldError}>{codeError}</p>
            : <p id="mfa-code-help" className={calm.help}>{text.codeHelp}</p>}
        </div>
        <div className={calm.row}>
          <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={confirm.isPending}>{text.confirm}</button>
          <button type="button" className={calm.button} onClick={() => setSetup(null)}>{text.cancel}</button>
        </div>
      </form>
    );
  }

  return (
    <PasswordForm text={text} id="mfa-start" help={text.startIntro} submit={text.start} pending={start.isPending}
      error={fieldText(start.error, 'password')} otherError={start.isError && !fieldText(start.error, 'password') ? start.error : null}
      password={password} onPassword={setPassword} onSubmit={() => start.mutate()} />
  );
}

/** New recovery codes, or turning it off: both ask for the password again. */
function Manage({ text }: { text: MfaMessages }) {
  const queryClient = useQueryClient();
  const fieldText = useFieldText(text);
  const [codesPassword, setCodesPassword] = useState('');
  const [offPassword, setOffPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: MFA_STATUS_KEY });
  const codes = useMutation({
    mutationFn: () => replaceRecoveryCodes(codesPassword),
    onSuccess: (result) => {
      setCodesPassword('');
      setRecoveryCodes(result.recoveryCodes);
    },
  });
  const off = useMutation({ mutationFn: () => disableMfa(offPassword), onSuccess: refresh });

  if (recoveryCodes) {
    return <RecoveryCodes text={text} codes={recoveryCodes} onDone={() => {
      setRecoveryCodes(null);
      void refresh();
    }} />;
  }
  return (
    <>
      <h3>{text.newCodes}</h3>
      <PasswordForm text={text} id="mfa-codes" help={text.newCodesHelp} submit={text.newCodes} pending={codes.isPending}
        error={fieldText(codes.error, 'password')} otherError={codes.isError && !fieldText(codes.error, 'password') ? codes.error : null}
        password={codesPassword} onPassword={setCodesPassword} onSubmit={() => codes.mutate()} />
      <h3>{text.disable}</h3>
      <PasswordForm text={text} id="mfa-off" help={text.disableHelp} submit={text.disable} pending={off.isPending} danger
        error={fieldText(off.error, 'password')} otherError={off.isError && !fieldText(off.error, 'password') ? off.error : null}
        password={offPassword} onPassword={setOffPassword} onSubmit={() => off.mutate()} />
    </>
  );
}

interface PasswordFormProps {
  text: MfaMessages;
  id: string;
  help: string;
  submit: string;
  pending: boolean;
  danger?: boolean;
  error: string | undefined;
  otherError: unknown;
  password: string;
  onPassword: (value: string) => void;
  onSubmit: () => void;
}

function PasswordForm({ text, id, help, submit, pending, danger, error, otherError, password, onPassword, onSubmit }: PasswordFormProps) {
  const { lang } = useLanguage();
  const handle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <form onSubmit={handle} noValidate>
      <p className={calm.help}>{help}</p>
      <div className={calm.field}>
        <label className={calm.label} htmlFor={`${id}-password`}>{text.password}</label>
        <input id={`${id}-password`} type="password" className={calm.input} autoComplete="current-password" value={password}
          onChange={(event) => onPassword(event.target.value)} aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-password-error` : undefined} />
        {error && <p id={`${id}-password-error`} className={calm.fieldError}>{error}</p>}
      </div>
      <button type="submit" className={`${calm.button} ${danger ? calm.danger : calm.primary}`} disabled={pending}>{submit}</button>
      {otherError !== null && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(otherError, lang)}</div>}
    </form>
  );
}

/** Shown once. Only the codes print (the print-area rule in app/globals.css). */
function RecoveryCodes({ text, codes, onDone }: { text: MfaMessages; codes: string[]; onDone: () => void }) {
  return (
    <div>
      <div className={`print-area ${styles.codes}`} aria-labelledby="mfa-codes-title">
        <h3 id="mfa-codes-title">{text.recoveryTitle}</h3>
        <p className={calm.help}>{text.recoveryIntro}</p>
        <ol>{codes.map((code) => <li key={code}><code>{code}</code></li>)}</ol>
      </div>
      <div className={calm.row}>
        <button type="button" className={calm.button} onClick={() => window.print()}>{text.recoveryPrint}</button>
        <button type="button" className={`${calm.button} ${calm.primary}`} onClick={onDone}>{text.recoveryDone}</button>
      </div>
    </div>
  );
}

/** Administrators: require two-step sign-in for every administrator of the school. */
function AdminRequirement({ text, required }: { text: MfaMessages; required: boolean }) {
  const queryClient = useQueryClient();
  const fieldText = useFieldText(text);
  const { lang } = useLanguage();
  const save = useMutation({
    mutationFn: (next: boolean) => setAdminMfaRequirement(next),
    onSuccess: (status) => queryClient.setQueryData(MFA_STATUS_KEY, status),
  });
  const error = fieldText(save.error, 'requiredForAdmins');

  return (
    <section className={calm.card} aria-labelledby="mfa-admin-title">
      <h2 id="mfa-admin-title">{text.adminTitle}</h2>
      <label className={calm.checkbox}>
        <input type="checkbox" checked={required} disabled={save.isPending} onChange={(event) => save.mutate(event.target.checked)}
          aria-describedby="mfa-admin-help" />
        {text.adminRequire}
      </label>
      <p id="mfa-admin-help" className={calm.help}>{text.adminHelp}</p>
      {save.isSuccess && <div className={`${calm.alert} ${calm.alertOk}`} role="status">{text.saved}</div>}
      {save.isError && (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{error ?? describeApiError(save.error, lang)}</div>
      )}
    </section>
  );
}
