'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { prefersReducedMotion } from '@/shared/services/motion.service';
import { FRAME_MS, SHEET_SPAN } from '../constants/sprite.constants';
import type { Character, SpriteAction, SpriteSheet } from '../interfaces/character.interface';
import styles from '../styles/SpriteFigure.module.css';

export interface PlayOptions {
  /** Keep the last frame (a fallen figure stays down) instead of returning to idle. */
  hold?: boolean;
  /** The caller's wait; a cancellable one stops the move when the battle closes. */
  wait: (ms: number) => Promise<void>;
}

export interface SpriteFigureHandle {
  play: (action: SpriteAction, options: PlayOptions) => Promise<void>;
  /** Back to the first idle frame, ready for a new fight. */
  reset: () => void;
}

interface SpriteFigureProps {
  character: Character;
  ref?: Ref<SpriteFigureHandle>;
}

const cellCount = (sheet: SpriteSheet) => Object.values(sheet.frames).reduce((sum, frames) => sum + frames.count, 0);

function backgroundPosition(sheet: SpriteSheet, action: SpriteAction, frame: number): string {
  const cells = cellCount(sheet);
  const cell = sheet.frames[action].first + frame;
  return `${cells > 1 ? (cell / (cells - 1)) * 100 : 0}% 0`;
}

/**
 * One battle character drawn from its sprite sheet. The idle frames loop on their own; play() runs one move. Frames are set
 * straight on the element's style, so a running animation never re-renders React.
 */
export function SpriteFigure({ character, ref }: SpriteFigureProps) {
  const sheet = character.spriteSheet;
  const node = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const idleFrame = useRef(0);

  const show = useCallback(
    (action: SpriteAction, frame: number) => {
      if (node.current) node.current.style.backgroundPosition = backgroundPosition(sheet, action, frame);
      if (action === 'idle') idleFrame.current = frame;
    },
    [sheet],
  );

  useImperativeHandle(
    ref,
    () => ({
      async play(action, { hold = false, wait }) {
        const { count } = sheet.frames[action];
        busy.current = true;
        if (prefersReducedMotion()) {
          show(action, hold ? count - 1 : 0);
          await wait(FRAME_MS[action] * count);
        } else {
          for (let frame = 0; frame < count; frame += 1) {
            show(action, frame);
            await wait(FRAME_MS[action]);
          }
        }
        if (hold) return;
        busy.current = false;
        show('idle', 0);
      },
      reset() {
        busy.current = false;
        show('idle', 0);
      },
    }),
    [sheet, show],
  );

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const timer = setInterval(() => {
      if (!busy.current) show('idle', (idleFrame.current + 1) % sheet.frames.idle.count);
    }, FRAME_MS.idle);
    return () => clearInterval(timer);
  }, [sheet, show]);

  return (
    <div
      ref={node}
      className={[styles.sheet, character.moves.sprite].filter(Boolean).join(' ')}
      style={{
        backgroundImage: `url(${sheet.src})`,
        backgroundSize: `${cellCount(sheet) * 100}% 100%`,
        backgroundPosition: backgroundPosition(sheet, 'idle', 0),
        width: `${(sheet.cellWidth / SHEET_SPAN) * 100}%`,
        aspectRatio: `${sheet.cellWidth} / ${sheet.cellHeight}`,
        // The figure box is square, so a percentage of its height equals the same percentage of its width.
        bottom: `${(-(1 - sheet.footLine) * sheet.cellHeight / SHEET_SPAN) * 100}%`,
      }}
    />
  );
}
