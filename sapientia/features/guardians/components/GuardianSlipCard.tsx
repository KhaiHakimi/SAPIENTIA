'use client';

import calm from '@/shared/calm/Calm.module.css';
import { formatDate } from '@/shared/i18n/format-date';
import { useLanguage } from '@/shared/i18n/useLanguage';
import type { GuardiansMessages } from '../i18n/guardians-messages.interface';
import type { GuardianSlip } from '../interfaces/guardian.interface';
import styles from '../styles/Guardians.module.css';

interface GuardianSlipCardProps {
  text: GuardiansMessages;
  slip: GuardianSlip;
  schoolName: string;
  timeZone: string;
  onDone: () => void;
}

/**
 * A slip to print and hand to the guardian in person. The temporary password exists only in this page's memory: "Done" or
 * leaving the page forgets it. When printing, only this section is printed (the global print-area rule).
 */
export function GuardianSlipCard({ text, slip, schoolName, timeZone, onDone }: GuardianSlipCardProps) {
  const { lang } = useLanguage();
  // Slips only appear after an action in the browser, never in the server render, so window is always there.
  const address = `${window.location.origin}/login`;

  return (
    <section className={`${calm.card} print-area`} aria-labelledby="guardian-slip-title">
      <div className={`${styles.slipActions} ${calm.spread}`}>
        <div>
          <h2 id="guardian-slip-title">{text.slipsTitle}</h2>
          <p className={calm.muted}>{text.slipsIntro}</p>
        </div>
        <div className={calm.row}>
          <button type="button" className={`${calm.button} ${calm.primary}`} onClick={() => window.print()}>{text.print}</button>
          <button type="button" className={calm.button} onClick={onDone}>{text.doneWithSlips}</button>
        </div>
      </div>
      <div className={styles.slip}>
        <p className={styles.slipHeading}>{text.slipHeading} · {schoolName}</p>
        <p className={styles.slipName}>{slip.name}</p>
        <p>{text.slipChildren(slip.children.join(', '))}</p>
        <dl className={styles.slipCredentials}>
          <dt>{text.slipUsername}</dt>
          <dd className={calm.code}>{slip.username}</dd>
          <dt>{text.slipPassword}</dt>
          <dd className={calm.code}>{slip.startingPassword}</dd>
        </dl>
        <p>{text.slipSteps(address)}</p>
        <p>{text.slipExpires(formatDate(slip.expiresAt, lang, { timeZone }))}</p>
        <p><strong>{text.slipKeepSafe}</strong></p>
      </div>
    </section>
  );
}
