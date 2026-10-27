'use client';

import { PixelCard } from '@/shared/components/PixelCard';
import { useMessages } from '@/shared/i18n/useLanguage';
import { DEMO_TODAY_INDEX } from '../../constants/demo-clock.constants';
import { SAMPLE_WEEK } from '../../data/sample-timetable';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import styles from '../../styles/Timetable.module.css';
import { TimetableSlotRow } from './TimetableSlotRow';

export function TimetableCard({ className }: { className?: string }) {
  const text = useMessages(DASHBOARD_MESSAGES);
  return (
    <PixelCard id="timetable" title={text.timetable} icon="scroll" aside={text.dayName} className={className}>
      <ul className={styles.list}>
        {SAMPLE_WEEK[DEMO_TODAY_INDEX].map((slot) => (
          <TimetableSlotRow key={slot.from} slot={slot} isToday variant="card" />
        ))}
      </ul>
    </PixelCard>
  );
}
