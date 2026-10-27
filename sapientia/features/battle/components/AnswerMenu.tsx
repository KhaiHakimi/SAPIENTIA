'use client';

import { useEffect, useRef } from 'react';
import styles from '../styles/BattleDialog.module.css';

interface AnswerMenuProps {
  labels: string[];
  label: string;
  onPick: (index: number) => void;
}

/** The 2x2 answer menu (or Fight again / Leave). Keys 1 to 4 and the arrow keys are handled by the battle dialog. */
export function AnswerMenu({ labels, label, onPick }: AnswerMenuProps) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
  }, [labels]);

  return (
    <div className={styles.menu} role="group" aria-label={label} data-answer-menu="">
      {labels.map((text, index) => (
        <button key={`${index}-${text}`} ref={index === 0 ? first : undefined} type="button" className={styles.option} onClick={() => onPick(index)}>
          <span className={styles.cursor} aria-hidden="true">
            ▶
          </span>
          {text}
        </button>
      ))}
    </div>
  );
}
