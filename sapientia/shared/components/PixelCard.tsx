import type { ReactNode } from 'react';
import type { PixelSpriteName } from '@/shared/sprites/pixel-sprites';
import { PixelSprite } from './PixelSprite';
import styles from './PixelCard.module.css';

interface PixelCardProps {
  id?: string;
  title: string;
  /** Each card title has its own pixel icon, the same one as its menu row, so the page can be scanned by picture. */
  icon?: PixelSpriteName;
  iconNode?: ReactNode;
  /** Small text at the right end of the title rule (a count, the day). */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A framed panel: the corner brackets and inner line come from the frame tokens, so a frame bought in the shop restyles every card. */
export function PixelCard({ id, title, icon, iconNode, aside, className, children }: PixelCardProps) {
  const titleId = id ? `${id}-title` : undefined;
  return (
    <section id={id} className={[styles.card, 'pixel-frame', 'px', className].filter(Boolean).join(' ')} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        {(icon || iconNode) && (
          <span className={styles.icon} aria-hidden="true">
            {iconNode ?? (icon && <PixelSprite name={icon} scale={icon === 'coin' ? 3 : 2} />)}
          </span>
        )}
        <span>{title}</span>
        {aside !== undefined && <small className={styles.aside}>{aside}</small>}
      </h2>
      {children}
    </section>
  );
}
