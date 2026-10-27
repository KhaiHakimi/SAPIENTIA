'use client';

import { useId } from 'react';
import { ModalDialog } from '@/shared/components/ModalDialog';
import { PixelButton } from '@/shared/components/PixelButton';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { useMessages } from '@/shared/i18n/useLanguage';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import { rankIndex } from '../../services/progress.service';
import styles from '../../styles/LevelUpDialog.module.css';

interface LevelUpDialogProps {
  /** The level just reached; null keeps the dialog closed. */
  level: number | null;
  onClose: () => void;
}

export function LevelUpDialog({ level, onClose }: LevelUpDialogProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const titleId = useId();
  return (
    <ModalDialog open={level !== null} onClose={onClose} labelledBy={titleId}>
      {level !== null && (
        <>
          <div className={styles.icon} aria-hidden="true">
            <PixelSprite name="trophy" scale={6} />
          </div>
          <h3 id={titleId}>{text.levelUpTitle(level)}</h3>
          <p>{text.levelUpText(text.ranks[rankIndex(level, text.ranks.length)])}</p>
          <PixelButton onClick={onClose}>{text.continue}</PixelButton>
        </>
      )}
    </ModalDialog>
  );
}
