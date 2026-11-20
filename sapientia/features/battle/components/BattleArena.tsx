'use client';

import { useImperativeHandle, useRef, type Ref } from 'react';
import type { Monster } from '@/features/characters';
import { SpriteFigure, type SpriteFigureHandle } from '@/features/characters/components/SpriteFigure';
import { usePahlawanCharacter } from '@/features/pahlawan/hooks/usePahlawanCharacter';
import type { BattleSide } from '../interfaces/battle-view.interface';
import type { HpState } from '../hooks/useBattleController';
import styles from '../styles/BattleArena.module.css';
import { HpPlate } from './HpPlate';

/** The parts of the arena the controller animates. */
export type ArenaPart = 'arena' | 'foeStage' | 'meStage' | 'foeFigure' | 'meFigure' | 'slash';

export interface BattleArenaHandle {
  element: (part: ArenaPart) => HTMLElement | null;
  sprite: (side: BattleSide) => SpriteFigureHandle | null;
}

interface BattleArenaProps {
  monster: Monster;
  foeName: string;
  heroName: string;
  heroLevel: number;
  hp: Record<BattleSide, HpState>;
  ref?: Ref<BattleArenaHandle>;
}

/** The painted arena with both fighters and their name plates. The battle controller plays animations through the handle. */
export function BattleArena({ monster, foeName, heroName, heroLevel, hp, ref }: BattleArenaProps) {
  const hero = usePahlawanCharacter();
  const arena = useRef<HTMLDivElement>(null);
  const foeStage = useRef<HTMLDivElement>(null);
  const meStage = useRef<HTMLDivElement>(null);
  const foeFigure = useRef<HTMLDivElement>(null);
  const meFigure = useRef<HTMLDivElement>(null);
  const slash = useRef<HTMLSpanElement>(null);
  const foeSprite = useRef<SpriteFigureHandle>(null);
  const meSprite = useRef<SpriteFigureHandle>(null);

  useImperativeHandle(
    ref,
    () => {
      const parts = { arena, foeStage, meStage, foeFigure, meFigure, slash };
      return {
        element: (part) => parts[part].current,
        sprite: (side) => (side === 'foe' ? foeSprite.current : meSprite.current),
      };
    },
    [],
  );

  return (
    <div className={styles.arena} ref={arena}>
      <HpPlate side="foe" name={foeName} level={monster.level} hp={hp.foe} />
      <div className={`${styles.stage} ${styles.foe}`} ref={foeStage}>
        <span className={styles.shadow} aria-hidden="true" />
        <div className={styles.figure} ref={foeFigure} aria-hidden="true">
          <SpriteFigure character={monster} ref={foeSprite} />
        </div>
        <span className={styles.slashTrail} ref={slash} aria-hidden="true" />
      </div>
      <div className={`${styles.stage} ${styles.me}`} ref={meStage}>
        <span className={styles.shadow} aria-hidden="true" />
        <div className={styles.figure} ref={meFigure} aria-hidden="true">
          <SpriteFigure character={hero} ref={meSprite} />
        </div>
      </div>
      <HpPlate side="me" name={heroName} level={heroLevel} hp={hp.me} />
    </div>
  );
}
