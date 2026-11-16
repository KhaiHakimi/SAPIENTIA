'use client';

import calm from '@/shared/calm/Calm.module.css';
import { formatDate } from '@/shared/i18n/format-date';
import { useLanguage } from '@/shared/i18n/useLanguage';
import type { StudentSlip } from '../interfaces/student.interface';
import type { StudentsMessages } from '../i18n/students-messages.interface';
import styles from '../styles/Students.module.css';

interface StudentSlipsProps {
  text: StudentsMessages;
  slips: readonly StudentSlip[];
  schoolName: string;
  timeZone: string;
  onDone: () => void;
}

/**
 * Slips to print and cut, one per pupil. The temporary passwords exist only in this page's memory: "Done" or leaving the
 * page forgets them. When printing, only this section is printed (the global print-area rule).
 */
export function StudentSlips({ text, slips, schoolName, timeZone, onDone }: StudentSlipsProps) {
  const { lang } = useLanguage();
  // Slips only appear after an action in the browser, never in the server render, so window is always there.
  const address = `${window.location.origin}/login`;

  return (
    <section className={`${calm.card} print-area`} aria-labelledby="slips-title">
      <div className={`${styles.slipActions} ${calm.spread}`}>
        <div>
          <h2 id="slips-title">{text.slipsTitle}</h2>
          <p className={calm.muted}>{text.slipsIntro}</p>
        </div>
        <div className={calm.row}>
          <button type="button" className={`${calm.button} ${calm.primary}`} onClick={() => window.print()}>{text.print}</button>
          <button type="button" className={calm.button} onClick={onDone}>{text.doneWithSlips}</button>
        </div>
      </div>
      <ul className={styles.slips}>
        {slips.map((slip) => (
          <li key={slip.studentId} className={styles.slip}>
            <p className={styles.slipHeading}>{text.slipHeading} · {schoolName}</p>
            <p className={styles.slipName}>{slip.name} <span>({slip.className})</span></p>
            <dl className={styles.slipCredentials}>
              <dt>{text.slipUsername}</dt>
              <dd className={calm.code}>{slip.username}</dd>
              <dt>{text.slipPassword}</dt>
              <dd className={calm.code}>{slip.startingPassword}</dd>
            </dl>
            <p>{text.slipSteps(address)}</p>
            <p>{text.slipExpires(formatDate(slip.expiresAt, lang, { timeZone }))}</p>
            <p><strong>{text.slipKeepSafe}</strong></p>
          </li>
        ))}
      </ul>
    </section>
  );
}
