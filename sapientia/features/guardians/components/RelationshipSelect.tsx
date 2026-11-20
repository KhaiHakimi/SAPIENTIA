'use client';

import calm from '@/shared/calm/Calm.module.css';
import { useMessages } from '@/shared/i18n/useLanguage';
import { GUARDIAN_RELATIONSHIPS } from '../constants/guardians.constants';
import { GUARDIAN_LABELS } from '../i18n/guardian-labels.messages';
import type { GuardianRelationship } from '../interfaces/guardian.interface';

interface RelationshipSelectProps {
  id: string;
  label: string;
  value: GuardianRelationship;
  onChange: (value: GuardianRelationship) => void;
}

/** The relationship type from the fixed list: never free text, so no circumstances are typed in. */
export function RelationshipSelect({ id, label, value, onChange }: RelationshipSelectProps) {
  const labels = useMessages(GUARDIAN_LABELS);
  return (
    <div className={calm.field}>
      <label className={calm.label} htmlFor={id}>{label}</label>
      <select id={id} className={calm.select} value={value} onChange={(event) => onChange(event.target.value as GuardianRelationship)}>
        {GUARDIAN_RELATIONSHIPS.map((code) => <option key={code} value={code}>{labels.relationships[code]}</option>)}
      </select>
    </div>
  );
}
