'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
  onRemoved: () => void;
}

/**
 * One login's actions (plan Phase 4, Sprint 14): disable or enable again (reversible), or remove for good after a
 * confirmation that says what removal means. The server refuses the administrator's own login and the last administrator.
 */
export function UserActions({ text, user, onRemoved }: UserActionsProps) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: USERS_KEY });
  const status = useMutation({
    mutationFn: () => updateUserStatus(user.id, { status: user.status === 'disabled' ? 'active' : 'disabled' }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => removeUser(user.id),
    onSuccess: async () => {
      setConfirming(false);
      onRemoved();
      await refresh();
    },
  });
  const failed = [status, remove].find((mutation) => mutation.isError);
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
        {!confirming && (
          <button type="button" className={`${calm.button} ${calm.small} ${calm.danger}`} onClick={() => setConfirming(true)}>
            {text.remove}
          </button>
        )}
      </div>
      {confirming && (
        <div className={`${calm.alert} ${calm.alertInfo}`} role="alert">
          <p>{text.confirmRemove(user.name)}</p>
          <div className={calm.row}>
            <button type="button" className={`${calm.button} ${calm.danger} ${calm.small}`} disabled={remove.isPending} onClick={() => remove.mutate()}>
              {text.remove}
            </button>
            <button type="button" className={`${calm.button} ${calm.small}`} onClick={() => setConfirming(false)}>{text.cancel}</button>
          </div>
        </div>
      )}
      {failed && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{failureText(failed.error)}</div>}
    </div>
  );
}
