'use client';

import { PixelCard } from '@/shared/components/PixelCard';
import { SegmentedBar } from '@/shared/components/SegmentedBar';
import { useMessages } from '@/shared/i18n/useLanguage';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import styles from '../../styles/ClassParty.module.css';

/** A shared class goal: how much homework the class has handed in. No names and no student rankings. */
export function ClassPartyCard({ className }: { className?: string }) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { classHandedIn, baseline } = useStudentProgress();
  const total = baseline.classTotal;

  return (
    <PixelCard id="party" title={text.party} icon="squire" className={className}>
      <SegmentedBar percent={Math.round((classHandedIn / total) * 100)} value={classHandedIn} max={total} tone="ok" aria-labelledby="party-title" />
      <p className={styles.text}>{text.partyText(classHandedIn, total)}</p>
      <p className={styles.note}>{text.partyNote}</p>
    </PixelCard>
  );
}
