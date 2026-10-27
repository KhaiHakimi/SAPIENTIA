'use client';

import { useId, useRef, type KeyboardEvent } from 'react';
import type { Monster } from '@/features/characters';
import { usePahlawan } from '@/features/pahlawan/hooks/usePahlawan';
import { useStudentProgress } from '@/features/student-dashboard/hooks/useStudentProgress';
import { ModalDialog } from '@/shared/components/ModalDialog';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { useBattleController } from '../hooks/useBattleController';
import { BATTLE_MESSAGES } from '../i18n/battle.messages';
import styles from '../styles/BattleDialog.module.css';
import { AnswerMenu } from './AnswerMenu';
import { BattleArena, type BattleArenaHandle } from './BattleArena';

interface BattleDialogProps {
  /** The monster to fight; null keeps the dialog closed. */
  monster: Monster | null;
  onClose: () => void;
  /** A level reached in battle, shown once the fight is closed. */
  onLevelUp: (level: number) => void;
}

const ARROW_STEP: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 };

/** The quiz battle, laid out like a classic handheld RPG: arena, typed text box, answer menu. */
export function BattleDialog({ monster, onClose, onLevelUp }: BattleDialogProps) {
  const text = useMessages(BATTLE_MESSAGES);
  const { pick } = useLanguage();
  const { displayName } = usePahlawan();
  const { level } = useStudentProgress();
  const arenaRef = useRef<BattleArenaHandle>(null);
  const textBoxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const controller = useBattleController(monster, { arena: arenaRef, textBox: textBoxRef, text: textRef, more: moreRef }, onClose, onLevelUp);
  const titleId = useId();

  // Enter or Space finishes a typing line; 1 to 4 pick an answer; the arrows move round the 2x2 menu.
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if ((event.key === 'Enter' || event.key === ' ') && controller.isTyping()) {
      event.preventDefault();
      controller.skipTyping();
      return;
    }
    if (!controller.menuLabels || event.ctrlKey || event.metaKey || event.altKey) return;
    const buttons = Array.from(menuRef.current?.querySelectorAll('button') ?? []);
    const number = Number(event.key);
    if (Number.isInteger(number) && number >= 1 && number <= buttons.length) {
      buttons[number - 1].click();
      return;
    }
    const step = ARROW_STEP[event.key];
    const here = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (step && here >= 0) {
      event.preventDefault();
      buttons[here + step]?.focus();
    }
  };

  return (
    <ModalDialog open={monster !== null} onClose={onClose} className={styles.battle} labelledBy={titleId} onKeyDown={onKeyDown}>
      {monster && (
        <>
          <h3 className="sr-only" id={titleId}>
            {text.dialogTitle(pick(monster.name))}
          </h3>
          <button className={styles.close} type="button" aria-label={text.close} onClick={onClose}>
            X
          </button>
          <BattleArena ref={arenaRef} monster={monster} foeName={pick(monster.name)} heroName={displayName} heroLevel={level} hp={controller.hp} />
          <div className={styles.textBox} ref={textBoxRef} tabIndex={-1} onClick={controller.skipTyping}>
            <span className={styles.tag}>{controller.topic}</span>
            <span ref={textRef} aria-hidden="true" />
            <button className={styles.more} type="button" ref={moreRef} hidden={!controller.moreVisible} aria-label={text.more} onClick={controller.pickMore}>
              ▼
            </button>
          </div>
          <div ref={menuRef}>
            {controller.menuLabels && <AnswerMenu labels={controller.menuLabels} label={text.menuLabel} onPick={controller.pickOption} />}
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {controller.liveText}
          </p>
          <p className={styles.record}>{text.record(controller.record.attempts, controller.record.wins)}</p>
        </>
      )}
    </ModalDialog>
  );
}
