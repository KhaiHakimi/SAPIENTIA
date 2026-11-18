'use client';

import { PixelCard } from '@/shared/components/PixelCard';
import { SegmentedBar } from '@/shared/components/SegmentedBar';
import { useMessages } from '@/shared/i18n/useLanguage';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import styles from '../../styles/ClassParty.module.css';

/**
 * A shared class goal: how much of this week's homework the class has handed in, as the teachers recorded it. Counts only, no
 * names and no rankings; the server withholds it in a very small class.
 */
export function ClassPartyCard({ className }: { className?: string }) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { classGoal, questsStatus } = useStudentProgress();

  let body;
  if (questsStatus !== 'ready') body = null;
  else if (!classGoal) body = <p className={styles.note}>{text.partyHidden}</p>;
  else if (classGoal.expected === 0) body = <p className={styles.text}>{text.partyNone}</p>;
  else {
    const { handedIn, expected } = classGoal;
    body = (
      <>
        <SegmentedBar percent={Math.round((handedIn / expected) * 100)} value={handedIn} max={expected} tone="ok" aria-labelledby="party-title" />
        <p className={styles.text}>{text.partyText(handedIn, expected)}</p>
        <p className={styles.note}>{text.partyNote}</p>
      </>
    );
  }

  return (
    <PixelCard id="party" title={text.party} icon="squire" className={className}>
      {body}
    </PixelCard>
  );
}
