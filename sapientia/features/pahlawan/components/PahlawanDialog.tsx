'use client';

import { useId, useRef } from 'react';
import { PLAYER_CHARACTER } from '@/features/characters';
import { CharacterPortrait } from '@/features/characters/components/CharacterPortrait';
import { ModalDialog } from '@/shared/components/ModalDialog';
import { PixelButton } from '@/shared/components/PixelButton';
import { useMessages } from '@/shared/i18n/useLanguage';
import { usePahlawan } from '../hooks/usePahlawan';
import { PAHLAWAN_MESSAGES } from '../i18n/pahlawan.messages';
import styles from '../styles/PahlawanDialog.module.css';

interface PahlawanDialogProps {
  open: boolean;
  onClose: () => void;
}

/** "Pahlawan Saya": the pahlawan's look is fixed; the student only names it. */
export function PahlawanDialog({ open, onClose }: PahlawanDialogProps) {
  const text = useMessages(PAHLAWAN_MESSAGES);
  const { name, rename, resetName } = usePahlawan();
  const titleId = useId();
  const introId = useId();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);

  return (
    <ModalDialog open={open} onClose={onClose} className={styles.dialog} labelledBy={titleId} describedBy={introId}>
      <div className={styles.head}>
        <h3 id={titleId}>{text.title}</h3>
        <button className={styles.close} type="button" aria-label={text.close} onClick={onClose}>
          X
        </button>
      </div>
      <p id={introId} className={styles.intro}>
        {text.intro}
      </p>
      <div className={styles.body}>
        <div className={styles.preview} aria-hidden="true">
          <CharacterPortrait character={PLAYER_CHARACTER} size={170} className={styles.portrait} />
        </div>
        <div className={styles.field}>
          <label htmlFor={inputId}>{text.nameLabel}</label>
          <input
            id={inputId}
            type="text"
            maxLength={12}
            autoComplete="off"
            placeholder={text.defaultName}
            // Uncontrolled, so a space typed between two words is not trimmed away mid-typing; only the cleaned name is stored.
            defaultValue={name}
            ref={input}
            onChange={(event) => rename(event.target.value)}
          />
        </div>
      </div>
      <div className={styles.actions}>
        <PixelButton
          variant="ghost"
          onClick={() => {
            resetName();
            if (input.current) input.current.value = '';
          }}
        >
          {text.reset}
        </PixelButton>
        <PixelButton onClick={onClose}>{text.done}</PixelButton>
      </div>
    </ModalDialog>
  );
}
