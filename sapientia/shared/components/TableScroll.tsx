import type { ReactNode } from 'react';
import calm from '@/shared/calm/Calm.module.css';

interface TableScrollProps {
  /** Id of the heading that names the table, read out when the box takes focus. */
  labelledBy: string;
  children: ReactNode;
}

/**
 * The box a wide table scrolls sideways in on a narrow screen. A table of plain text holds nothing that takes keyboard focus,
 * so the box itself is a named region in the tab order: someone without a mouse can focus it and scroll with the arrow keys
 * (WCAG 2.1.1, axe rule scrollable-region-focusable).
 */
export function TableScroll({ labelledBy, children }: TableScrollProps) {
  return (
    <div className={calm.tableWrap} role="region" aria-labelledby={labelledBy} tabIndex={0}>
      {children}
    </div>
  );
}
