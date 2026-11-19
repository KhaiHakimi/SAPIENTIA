'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { resetUserMfa } from '@/features/mfa/services/mfa.client';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage } from '@/shared/i18n/useLanguage';
import type { UsersMessages } from '../i18n/users-messages.interface';
import type { StaffUser } from '../interfaces/staff-user.interface';
import { removeUser, updateUserStatus, USERS_KEY } from '../services/users.client';

interface UserActionsProps {
  text: UsersMessages;
  user: StaffUser;
  /** A sentence for the page once something has been done (removed, reset). */
  onNotice: (message: string) => void;
}

/**
 * One login's actions (plan Phase 4, Sprint 14): disable or enable again (reversible), reset two-step sign-in for a lost
 * phone, or remove for good, each permanent step after a confirmation that says what it means. The server refuses the
 * administrator's own login.
 */
export function UserActions({ text, user, onNotice }: UserActionsProps) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<'remove' | 'mfa' | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: USERS_KEY });
  const status = useMutation({
    mutationFn: () => updateUserStatus(user.id, { status: user.status === 'disabled' ? 'active' : 'disabled' }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => removeUser(user.id),
    onSuccess: async () => {
      setConfirming(null);
      onNotice(text.removed(user.name));
      await refresh();
    },
  });
  const reset = useMutation({
    mutationFn: () => resetUserMfa(user.id),
    onSuccess: async () => {
      setConfirming(null);
      onNotice(text.mfaReset(user.name));
      await refresh();
    },
  });
  const failed = [status, remove, reset].find((mutation) => mutation.isError);
  const failureText = (error: unknown) => {
    const code = error instanceof ApiError ? Object.values(error.fields)[0] : undefined;
    return (code && text.fieldErrors[code]) || describeApiError(error, lang);
  };

  return (
    <div role="group" aria-label={text.manage(user.name)}>
      <div className={calm.row}>
        <button type="button" className={`${calm.button} ${calm.small}`} disabled={status.isPending} onClick={() => status.mutate()}>
          {user.status === 'disabled' ? text.enable : text.disable}
        </button>
        {user.mfaEnabled && confirming === null && (
          <button type="button" className={`${calm.button} ${calm.small}`} onClick={() => setConfirming('mfa')}>{text.resetMfa}</button>
        )}
        {confirming === null && (
          <button type="button" className={`${calm.button} ${calm.small} ${calm.danger}`} onClick={() => setConfirming('remove')}>
            {text.remove}
          </button>
        )}
      </div>
      {confirming !== null && (
        <div className={`${calm.alert} ${calm.alertInfo}`} role="alert">
          <p>{confirming === 'remove' ? text.confirmRemove(user.name) : text.confirmResetMfa(user.name)}</p>
          <div className={calm.row}>
            {confirming === 'remove' ? (
              <button type="button" className={`${calm.button} ${calm.danger} ${calm.small}`} disabled={remove.isPending} onClick={() => remove.mutate()}>
                {text.remove}
              </button>
            ) : (
              <button type="button" className={`${calm.button} ${calm.danger} ${calm.small}`} disabled={reset.isPending} onClick={() => reset.mutate()}>
                {text.resetMfa}
              </button>
            )}
            <button type="button" className={`${calm.button} ${calm.small}`} onClick={() => setConfirming(null)}>{text.cancel}</button>
          </div>
        </div>
      )}
      {failed && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{failureText(failed.error)}</div>}
    </div>
  );
}
