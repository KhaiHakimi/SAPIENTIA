'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { LINK_REMOVAL_REASONS } from '../constants/guardians.constants';
import { GUARDIAN_LABELS } from '../i18n/guardian-labels.messages';
import type { GuardiansMessages } from '../i18n/guardians-messages.interface';
import type { GuardianLink, GuardianRelationship, GuardianSlip, LinkRemovalReason, SchoolGuardian } from '../interfaces/guardian.interface';
import {
  addGuardianLink,
  GUARDIANS_KEY,
  removeGuardian,
  removeGuardianLink,
  resetGuardianPassword,
  updateGuardian,
} from '../services/guardians.client';
import styles from '../styles/Guardians.module.css';
import { PupilPicker } from './PupilPicker';
import { RelationshipSelect } from './RelationshipSelect';

const STATUS_BADGE = { active: calm.badgeOk, disabled: calm.badgeDanger } as const;

interface GuardianRowProps {
  text: GuardiansMessages;
  guardian: SchoolGuardian;
  onSlip: (slip: GuardianSlip) => void;
}

/** One guardian and, when opened, the panel to remove or add links, print a new slip, disable or remove them (story S13-2). */
export function GuardianRow({ text, guardian, onSlip }: GuardianRowProps) {
  const { lang } = useLanguage();
  const labels = useMessages(GUARDIAN_LABELS);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: GUARDIANS_KEY });

  const status = useMutation({ mutationFn: () => updateGuardian(guardian.id, { status: guardian.status === 'active' ? 'disabled' : 'active' }), onSuccess: refresh });
  const slip = useMutation({ mutationFn: () => resetGuardianPassword(guardian.id), onSuccess: (created) => {
    onSlip(created);
    void refresh();
  } });
  const remove = useMutation({ mutationFn: () => removeGuardian(guardian.id), onSuccess: refresh });
  const failed = [status, slip, remove].find((mutation) => mutation.isError);
  const panelId = `guardian-${guardian.id}-panel`;
  const reasonText = (link: GuardianLink) => {
    if (!link.endReason) return '';
    const all: Record<string, string> = { ...labels.refusalReasons, ...labels.removalReasons };
    return text.endedBecause(all[link.endReason]);
  };

  return (
    <>
      <tr>
        <td>{guardian.name}</td>
        <td className={calm.code}>{guardian.username}</td>
        <td>
          <ul className={styles.links}>
            {guardian.links.map((link) => (
              <li key={link.id} className={link.status === 'active' ? undefined : styles.ended}>
                {link.student.name} ({link.student.className}) · {labels.relationships[link.relationship]}
                {link.status !== 'active' && <> · {text.linkStatuses[link.status]}. {reasonText(link)}</>}
              </li>
            ))}
          </ul>
        </td>
        <td>
          <span className={`${calm.badge} ${STATUS_BADGE[guardian.status]}`}>{text.statuses[guardian.status]}</span>
          {!guardian.hasOwnPassword && <div className={calm.help}>{text.slipNotUsed}</div>}
        </td>
        <td>
          <button type="button" className={`${calm.button} ${calm.small}`} aria-expanded={open} aria-controls={panelId}
            aria-label={text.manage(guardian.name)} onClick={() => setOpen((shown) => !shown)}>
            {open ? text.close : text.manageButton}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} id={panelId} className={styles.panel}>
            {failed && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(failed.error, lang)}</div>}
            {guardian.links.filter((link) => link.status === 'active').map((link) => (
              <RemoveLinkRow key={link.id} text={text} guardianId={guardian.id} link={link} onDone={refresh} />
            ))}
            <AddLinkForm text={text} guardianId={guardian.id} onDone={refresh} />
            <div className={calm.row}>
              <Link href={`/staff/guardians/${encodeURIComponent(guardian.id)}/summary`} className={calm.button}
                aria-label={text.summaryLinkLabel(guardian.name)}>
                {text.summaryLink}
              </Link>
              <button type="button" className={calm.button} disabled={slip.isPending} onClick={() => slip.mutate()}>{text.newSlip}</button>
              <button type="button" className={calm.button} disabled={status.isPending} onClick={() => status.mutate()}>
                {guardian.status === 'active' ? text.disable : text.enable}
              </button>
              {!confirmingRemove && (
                <button type="button" className={`${calm.button} ${calm.danger}`} onClick={() => setConfirmingRemove(true)}>{text.remove}</button>
              )}
            </div>
            {confirmingRemove && (
              <div className={`${calm.alert} ${calm.alertInfo}`} role="alert">
                <p>{text.confirmRemove(guardian.name)}</p>
                <div className={calm.row}>
                  <button type="button" className={`${calm.button} ${calm.danger}`} disabled={remove.isPending} onClick={() => remove.mutate()}>
                    {text.remove}
                  </button>
                  <button type="button" className={calm.button} onClick={() => setConfirmingRemove(false)}>{text.cancel}</button>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

interface LinkFormProps {
  text: GuardiansMessages;
  guardianId: string;
  onDone: () => Promise<void>;
}

/** Removes one active link, with a reason from the fixed list. */
function RemoveLinkRow({ text, guardianId, link, onDone }: LinkFormProps & { link: GuardianLink }) {
  const { lang } = useLanguage();
  const labels = useMessages(GUARDIAN_LABELS);
  const [reason, setReason] = useState<LinkRemovalReason>('entered_in_error');
  const remove = useMutation({ mutationFn: () => removeGuardianLink(guardianId, link.id, reason), onSuccess: onDone });
  const id = `remove-link-${link.id}`;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    remove.mutate();
  };

  return (
    <form className={styles.linkRow} onSubmit={onSubmit} aria-label={text.removeLink(link.student.name)}>
      <span>{link.student.name} ({link.student.className}) · {labels.relationships[link.relationship]}</span>
      <div className={calm.field}>
        <label className={calm.label} htmlFor={id}>{text.removeReason}</label>
        <select id={id} className={calm.select} value={reason} onChange={(event) => setReason(event.target.value as LinkRemovalReason)}>
          {LINK_REMOVAL_REASONS.map((code) => <option key={code} value={code}>{labels.removalReasons[code]}</option>)}
        </select>
      </div>
      <button type="submit" className={`${calm.button} ${calm.danger} ${calm.small}`} disabled={remove.isPending}>{text.confirmRemoveLink}</button>
      {remove.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(remove.error, lang)}</div>}
    </form>
  );
}

/** Links this guardian to another child. */
function AddLinkForm({ text, guardianId, onDone }: LinkFormProps) {
  const { lang } = useLanguage();
  const [studentId, setStudentId] = useState('');
  const [relationship, setRelationship] = useState<GuardianRelationship>('mother');
  const add = useMutation({ mutationFn: () => addGuardianLink(guardianId, { studentId, relationship }), onSuccess: onDone });
  const fields = add.error instanceof ApiError ? add.error.fields : {};
  const fieldText = (code: string | undefined) => (code ? (text.fieldErrors[code] ?? describeFieldError(code, lang)) : undefined);
  const otherFailure = add.isError && !fields.studentId;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    add.mutate();
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <fieldset className={calm.fieldset}>
        <legend>{text.addLinkTitle}</legend>
        <div className={styles.panelForm}>
          <PupilPicker text={text} idPrefix={`link-${guardianId}`} studentId={studentId} onChange={setStudentId} error={fieldText(fields.studentId)} />
          <RelationshipSelect id={`link-${guardianId}-relationship`} label={text.relationship} value={relationship} onChange={setRelationship} />
          <button type="submit" className={calm.button} disabled={add.isPending}>{text.addLink}</button>
        </div>
        {otherFailure && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(add.error, lang)}</div>}
      </fieldset>
    </form>
  );
}
