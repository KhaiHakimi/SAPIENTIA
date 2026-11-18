'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDayShort } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { toggleTheme } from '@/shared/theme/theme.store';
import { useCurrentGuardian, useGuardianSignOut } from '../hooks/useCurrentGuardian';
import { GUARDIAN_LABELS } from '../i18n/guardian-labels.messages';
import { GUARDIAN_VIEW_MESSAGES } from '../i18n/guardian-view.messages';
import type { GuardianChild } from '../interfaces/guardian.interface';
import { fetchGuardianChildren, GUARDIAN_CHILDREN_KEY } from '../services/guardian-auth.client';
import styles from '../styles/Guardians.module.css';
import { ChildWeek } from './ChildWeek';
import { GuardianPasswordForm } from './GuardianPasswordForm';
import { RefuseLinkForm } from './RefuseLinkForm';

/**
 * The guardian's page (plan Phase 4, Sprint 13): calm and read only (plan D8). A guardian still on the slip's password chooses
 * their own first; without a session the hook sends the browser to the sign-in page.
 */
export function GuardianHome() {
  const text = useMessages(GUARDIAN_VIEW_MESSAGES);
  const { toggleLang } = useLanguage();
  const signOut = useGuardianSignOut();
  const { data } = useCurrentGuardian();
  if (!data) return null;
  const { guardian } = data;

  return (
    <>
      <header className={styles.header}>
        <div className={styles.brand}>
          <strong>{text.brand}</strong>
          <span className={calm.muted}>{guardian.schoolName}</span>
        </div>
        <div className={calm.row}>
          <button type="button" className={`${calm.button} ${calm.small}`} onClick={toggleLang}>
            BM | EN <span className="sr-only">{text.switchLanguage}</span>
          </button>
          <button type="button" className={`${calm.button} ${calm.small}`} onClick={toggleTheme}>{text.theme}</button>
          <button type="button" className={`${calm.button} ${calm.small}`} onClick={() => void signOut()}>{text.signOut}</button>
        </div>
      </header>
      <main className={calm.page}>
        {data.mustChangePassword
          ? <GuardianPasswordForm text={text} name={guardian.name} />
          : <Children name={guardian.name} timeZone={guardian.timeZone} />}
      </main>
    </>
  );
}

function Children({ name, timeZone }: { name: string; timeZone: string }) {
  const text = useMessages(GUARDIAN_VIEW_MESSAGES);
  const { lang } = useLanguage();
  const children = useQuery({ queryKey: GUARDIAN_CHILDREN_KEY, queryFn: fetchGuardianChildren });
  const [refusedNotice, setRefusedNotice] = useState(false);

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.hello(name)}</h1>
          <p>{text.intro}</p>
          <p className={calm.help}>{text.sampleNote}</p>
        </div>
      </div>
      {refusedNotice && <div className={`${calm.alert} ${calm.alertOk}`} role="status">{text.refused}</div>}
      {children.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : children.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(children.error, lang)}</div>
      ) : children.data.children.length === 0 ? (
        <p className={calm.empty}>{text.noChildren}</p>
      ) : (
        children.data.children.map((child) => (
          <ChildSection key={child.linkId} child={child} timeZone={timeZone} onRefused={() => setRefusedNotice(true)} />
        ))
      )}
    </>
  );
}

function ChildSection({ child, timeZone, onRefused }: { child: GuardianChild; timeZone: string; onRefused: () => void }) {
  const text = useMessages(GUARDIAN_VIEW_MESSAGES);
  const labels = useMessages(GUARDIAN_LABELS);
  const { lang } = useLanguage();
  const headingId = `child-${child.linkId}`;

  return (
    <section className={`${calm.card} ${styles.child}`} aria-labelledby={headingId}>
      <h2 id={headingId}>{text.childHeading(child.name, child.className)}</h2>
      <p className={calm.muted}>{text.relationshipLine(labels.relationships[child.relationship])}</p>

      <h3>{text.homeworkTitle}</h3>
      {child.homework.length === 0 ? (
        <p className={calm.empty}>{text.homeworkEmpty}</p>
      ) : (
        <div className={calm.tableWrap}>
          <table className={calm.table}>
            <thead>
              <tr>
                <th scope="col">{text.columns.due}</th>
                <th scope="col">{text.columns.subject}</th>
                <th scope="col">{text.columns.title}</th>
                <th scope="col">{text.columns.teacher}</th>
                <th scope="col">{text.columns.handedIn}</th>
              </tr>
            </thead>
            <tbody>
              {child.homework.map((item) => (
                <tr key={item.id}>
                  <td>{formatDayShort(item.dueOn, lang)}</td>
                  <td>{item.subjectName}</td>
                  <td>
                    {item.title}
                    {item.details && <div className={calm.help}>{item.details}</div>}
                  </td>
                  <td>{item.teacherName}</td>
                  <td>
                    <span className={`${calm.badge} ${item.handedIn ? calm.badgeOk : ''}`}>{item.handedIn ? text.handedInYes : text.handedInNo}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={calm.help}>{text.handInNote}</p>

      <h3>{text.weekTitle}</h3>
      <ChildWeek text={text} linkId={child.linkId} timeZone={timeZone} />

      <RefuseLinkForm text={text} linkId={child.linkId} childName={child.name} onRefused={onRefused} />
    </section>
  );
}
