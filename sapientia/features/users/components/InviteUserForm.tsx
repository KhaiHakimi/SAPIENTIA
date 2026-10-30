'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { StaffRole } from '@/features/auth/interfaces/session-user.interface';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDate } from '@/shared/i18n/format-date';
import { useLanguage } from '@/shared/i18n/useLanguage';
import type { InviteUserResult } from '../interfaces/staff-user.interface';
import type { UsersMessages } from '../i18n/users-messages.interface';
import { inviteUser, STAFF_DIRECTORY_KEY, USERS_KEY } from '../services/users.client';

const ROLES: readonly StaffRole[] = ['teacher', 'sender', 'admin'];

export function InviteUserForm({ text }: { text: UsersMessages }) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole | ''>('');
  const [result, setResult] = useState<InviteUserResult | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const invite = useMutation({
    mutationFn: inviteUser,
    onSuccess: (created) => {
      setResult(created);
      setCopyState('idle');
      setName('');
      setEmail('');
      setRole('');
      void queryClient.invalidateQueries({ queryKey: USERS_KEY });
      void queryClient.invalidateQueries({ queryKey: STAFF_DIRECTORY_KEY });
    },
  });
  const fields = invite.error instanceof ApiError ? invite.error.fields : {};

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);
    invite.mutate({ name, email, role: role as StaffRole });
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  return (
    <section className={calm.card} aria-labelledby="invite-title">
      <h2 id="invite-title">{text.inviteTitle}</h2>
      <p className={calm.muted}>{text.inviteIntro}</p>

      {invite.isError && (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(invite.error, lang)}</div>
      )}

      {result && (
        <div className={`${calm.alert} ${calm.alertOk}`} role="status">
          <p>{text.invited(result.user.name)}</p>
          <label className={calm.label} htmlFor="invite-link">{text.linkLabel}</label>
          <input id="invite-link" className={`${calm.input} ${calm.code}`} readOnly value={result.inviteUrl} onFocus={(event) => event.target.select()} />
          <p className={calm.help}>{text.linkHelp(formatDate(result.expiresAt, lang, { withTime: true }))}</p>
          <div className={calm.row}>
            <button type="button" className={`${calm.button} ${calm.small}`} onClick={copy}>{text.copy}</button>
            <span aria-live="polite">{copyState === 'copied' ? text.copied : copyState === 'failed' ? text.copyFailed : ''}</span>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="invite-name">{text.name}</label>
          <input id="invite-name" className={calm.input} value={name} onChange={(event) => setName(event.target.value)}
            autoComplete="off" aria-invalid={Boolean(fields.name)} aria-describedby="invite-name-error" />
          <div id="invite-name-error" className={calm.fieldError}>{describeFieldError(fields.name, lang)}</div>
        </div>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="invite-email">{text.email}</label>
          <input id="invite-email" type="email" className={calm.input} value={email} onChange={(event) => setEmail(event.target.value)}
            autoComplete="off" inputMode="email" aria-invalid={Boolean(fields.email)} aria-describedby="invite-email-error" />
          <div id="invite-email-error" className={calm.fieldError}>{describeFieldError(fields.email, lang)}</div>
        </div>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="invite-role">{text.role}</label>
          <select id="invite-role" className={calm.select} value={role} onChange={(event) => setRole(event.target.value as StaffRole)}
            aria-invalid={Boolean(fields.role)} aria-describedby="invite-role-error">
            <option value="">{text.chooseRole}</option>
            {ROLES.map((option) => <option key={option} value={option}>{text.roles[option]}</option>)}
          </select>
          <div id="invite-role-error" className={calm.fieldError}>{describeFieldError(fields.role, lang)}</div>
        </div>
        <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={invite.isPending}>
          {invite.isPending ? text.sending : text.send}
        </button>
      </form>
    </section>
  );
}
