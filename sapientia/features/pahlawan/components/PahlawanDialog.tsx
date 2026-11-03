'use client';

import Image from 'next/image';
import { useId, useRef } from 'react';
import { CharacterPortrait } from '@/features/characters/components/CharacterPortrait';
import { ModalDialog } from '@/shared/components/ModalDialog';
import { PixelButton } from '@/shared/components/PixelButton';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { OUTFIT_COLOURS } from '../data/outfit-colours';
import { usePahlawan } from '../hooks/usePahlawan';
import { usePahlawanCharacter } from '../hooks/usePahlawanCharacter';
import { PAHLAWAN_MESSAGES } from '../i18n/pahlawan.messages';
import type { OutfitPart } from '../interfaces/outfit.interface';
import styles from '../styles/PahlawanDialog.module.css';

interface PahlawanDialogProps {
  open: boolean;
  onClose: () => void;
}

const PARTS: readonly OutfitPart[] = ['clothes', 'sampin'];

/** "Pahlawan Saya": name the pahlawan and choose the colours of the clothes and the sampin, seen at once in the preview. */
export function PahlawanDialog({ open, onClose }: PahlawanDialogProps) {
  const text = useMessages(PAHLAWAN_MESSAGES);
  const { pick } = useLanguage();
  const { name, outfit, rename, setColour, reset } = usePahlawan();
  const character = usePahlawanCharacter();
  const titleId = useId();
  const introId = useId();
  const inputId = useId();
  const groupName = useId();
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
          <CharacterPortrait character={character} size={170} className={styles.portrait} />
        </div>
        <div className={styles.fields}>
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
          {PARTS.map((part) => (
            <fieldset key={part} className={styles.colours}>
              <legend>{text.partLabel[part]}</legend>
              <div className={styles.swatches}>
                {OUTFIT_COLOURS.map((colour) => (
                  <label key={colour.id} className={styles.swatch} title={pick(colour.name)}>
                    <input
                      type="radio"
                      name={`${groupName}-${part}`}
                      value={colour.id}
                      checked={outfit[part] === colour.id}
                      onChange={() => setColour(part, colour.id)}
                    />
                    {/* Decorative item picture from the warrior sheet; the colour name is the label. Pixel art, served as drawn. */}
                    <Image src={`/pahlawan/outfit/${part}-${colour.id}.png`} alt="" width={44} height={44} unoptimized />
                    <span>{pick(colour.name)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
      <div className={styles.actions}>
        <PixelButton
          variant="ghost"
          onClick={() => {
            reset();
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
