'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { LINK_REFUSAL_REASONS } from '../constants/guardians.constants';
import { GUARDIAN_LABELS } from '../i18n/guardian-labels.messages';
import type { GuardianViewMessages } from '../i18n/guardian-view-messages.interface';
import type { LinkRefusalReason } from '../interfaces/guardian.interface';
import { GUARDIAN_CHILDREN_KEY, refuseLink } from '../services/guardian-auth.client';
import styles from '../styles/Guardians.module.css';

interface RefuseLinkFormProps {
  text: GuardianViewMessages;
  linkId: string;
  childName: string;
  onRefused: () => void;
}

/** Story S13-4: the guardian refuses a link that is wrong, with a reason from a fixed list, after a confirmation step. */
export function RefuseLinkForm({ text, linkId, childName, onRefused }: RefuseLinkFormProps) {
  const { lang } = useLanguage();
  const labels = useMessages(GUARDIAN_LABELS);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<LinkRefusalReason>('not_my_child');
  const refuse = useMutation({
    mutationFn: () => refuseLink(linkId, reason),
    onSuccess: async () => {
      onRefused();
      await queryClient.invalidateQueries({ queryKey: GUARDIAN_CHILDREN_KEY });
    },
  });
  const formId = `refuse-${linkId}`;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    refuse.mutate();
  };

  return (
    <div className={styles.refusal}>
      {!open ? (
        <button type="button" className={calm.linkButton} aria-expanded={false} aria-controls={formId} onClick={() => setOpen(true)}>
          {text.refuseOpen}
        </button>
      ) : (
        <form id={formId} onSubmit={onSubmit}>
          <fieldset className={calm.fieldset}>
            <legend>{text.refuseTitle(childName)}</legend>
            <p className={calm.help}>{text.refuseIntro}</p>
            <p className={calm.label}>{text.refuseReason}</p>
            {LINK_REFUSAL_REASONS.map((code) => (
              <label key={code} className={calm.checkbox}>
                <input type="radio" name={`${formId}-reason`} value={code} checked={reason === code} onChange={() => setReason(code)} />
                {labels.refusalReasons[code]}
              </label>
            ))}
          </fieldset>
          {refuse.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(refuse.error, lang)}</div>}
          <div className={calm.row}>
            <button type="submit" className={`${calm.button} ${calm.danger}`} disabled={refuse.isPending}>{text.refuseConfirm}</button>
            <button type="button" className={calm.button} onClick={() => setOpen(false)}>{text.cancel}</button>
          </div>
        </form>
      )}
    </div>
  );
}
