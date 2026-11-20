'use client';

import { useId, type ReactNode } from 'react';
import { ModalDialog } from './ModalDialog';
import { PixelSprite } from './PixelSprite';
import styles from './ScrollDialog.module.css';

interface ScrollDialogProps {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  closeLabel: string;
  /** Wide scrolls hold the shop and the weekly timetable. */
  wide?: boolean;
  /** Buttons for the sticky footer; the wax seal sits on its left. */
  actions: ReactNode;
  children: ReactNode;
}

/** A parchment that unrolls between two wooden rods. Used for the quest message, the shop and the weekly timetable. */
export function ScrollDialog({ open, onClose, eyebrow, title, closeLabel, wide = false, actions, children }: ScrollDialogProps) {
  const titleId = useId();
  return (
    <ModalDialog open={open} onClose={onClose} closeOnBackdrop labelledBy={titleId} className={[styles.scroll, wide && styles.wide].filter(Boolean).join(' ')}>
      <div className={styles.rod} aria-hidden="true" />
      <div className={styles.paper}>
        <button className={styles.close} type="button" aria-label={closeLabel} onClick={onClose}>
          X
        </button>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h3 id={titleId} className={styles.title}>
          {title}
        </h3>
        {children}
        <div className={styles.actions}>
          <span className={styles.seal} aria-hidden="true">
            <PixelSprite name="seal" scale={4} />
          </span>
          {actions}
        </div>
      </div>
      <div className={styles.rod} aria-hidden="true" />
    </ModalDialog>
  );
}

/** Class names for content inside a scroll (headings, lists, meta rows), shared by every scroll dialog. */
export { styles as scrollStyles };
