'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage } from '@/shared/i18n/useLanguage';
import type { GuardiansMessages } from '../i18n/guardians-messages.interface';
import type { AddGuardianResult, GuardianRelationship } from '../interfaces/guardian.interface';
import { addGuardian, GUARDIANS_KEY } from '../services/guardians.client';
import { PupilPicker } from './PupilPicker';
import { RelationshipSelect } from './RelationshipSelect';

interface AddGuardianFormProps {
  text: GuardiansMessages;
  onAdded: (result: AddGuardianResult) => void;
}

/** Story S13-1: a guardian's name, their child and the relationship; the slip follows. */
export function AddGuardianForm({ text, onAdded }: AddGuardianFormProps) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [relationship, setRelationship] = useState<GuardianRelationship>('mother');
  const add = useMutation({
    mutationFn: () => addGuardian({ name, studentId, relationship }),
    onSuccess: async (result) => {
      onAdded(result);
      setName('');
      setStudentId('');
      await queryClient.invalidateQueries({ queryKey: GUARDIANS_KEY });
    },
  });
  const fields = add.error instanceof ApiError ? add.error.fields : {};
  const fieldText = (code: string | undefined) => (code ? (text.fieldErrors[code] ?? describeFieldError(code, lang)) : undefined);
  const otherFailure = add.isError && !(add.error instanceof ApiError && add.error.code === 'validation');

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    add.mutate();
  };

  return (
    <section className={calm.card} aria-labelledby="add-guardian-title">
      <h2 id="add-guardian-title">{text.addTitle}</h2>
      <p className={calm.help}>{text.addIntro}</p>
      {otherFailure && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(add.error, lang)}</div>}
      {add.isSuccess && <div className={`${calm.alert} ${calm.alertOk}`} role="status">{text.added}</div>}
      <form onSubmit={onSubmit} noValidate>
        <div className={calm.field}>
          <label className={calm.label} htmlFor="add-guardian-name">{text.name}</label>
          <input id="add-guardian-name" className={calm.input} value={name} autoComplete="off" onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fields.name)} aria-describedby="add-guardian-name-error" />
          <div id="add-guardian-name-error" className={calm.fieldError}>{fieldText(fields.name) ?? ''}</div>
        </div>
        <PupilPicker text={text} idPrefix="add-guardian" studentId={studentId} onChange={setStudentId} error={fieldText(fields.studentId)} />
        <RelationshipSelect id="add-guardian-relationship" label={text.relationship} value={relationship} onChange={setRelationship} />
        <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={add.isPending}>{add.isPending ? text.adding : text.add}</button>
      </form>
    </section>
  );
}
