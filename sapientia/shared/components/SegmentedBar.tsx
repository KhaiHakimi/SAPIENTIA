import type { AriaAttributes } from 'react';
import styles from './SegmentedBar.module.css';

interface SegmentedBarProps extends Pick<AriaAttributes, 'aria-label' | 'aria-labelledby' | 'aria-valuetext'> {
  /** Fill, 0 to 100. */
  percent: number;
  /** The value announced to screen readers when it is not the percentage (for example 19 of 25). */
  value?: number;
  max?: number;
  tone?: 'xp' | 'boss' | 'ok' | 'skill';
  thin?: boolean;
}

/** A pixel progress bar: the fill is clipped by a notch every 10px and grows in steps. */
export function SegmentedBar({ percent, value, max = 100, tone = 'xp', thin = false, ...aria }: SegmentedBarProps) {
  return (
    <div
      className={[styles.bar, thin && styles.thin].filter(Boolean).join(' ')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value ?? percent}
      {...aria}
    >
      <i className={`${styles.fill} ${styles[tone]}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}
