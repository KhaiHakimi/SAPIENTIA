import { useId } from 'react';
import type { HpState } from '../hooks/useBattleController';
import styles from '../styles/HpPlate.module.css';

interface HpPlateProps {
  side: 'foe' | 'me';
  name: string;
  level: number;
  hp: HpState;
}

const levelOf = (percent: number) => (percent > 50 ? 'ok' : percent > 20 ? 'warn' : 'low');

/** A bronze-framed name plate with the HP bar; the bar drains in steps and turns yellow, then red. */
export function HpPlate({ side, name, level, hp }: HpPlateProps) {
  const nameId = useId();
  const percent = Math.max(0, Math.round((hp.hp / hp.max) * 100));
  return (
    <div className={`${styles.plate} ${side === 'foe' ? styles.foe : styles.me}`}>
      <div className={styles.nameRow}>
        <span id={nameId}>{name}</span>
        <span>L{level}</span>
      </div>
      <div className={styles.hpRow}>
        <span className={styles.label} aria-hidden="true">
          HP
        </span>
        <div
          className={styles.bar}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${hp.hp} / ${hp.max}`}
          aria-labelledby={nameId}
        >
          <i className={`${styles.fill} ${styles[levelOf(percent)]}`} style={{ width: `${percent}%`, transition: hp.instant ? 'none' : undefined }} />
        </div>
      </div>
      <div className={styles.number}>
        {hp.hp} / {hp.max}
      </div>
    </div>
  );
}
