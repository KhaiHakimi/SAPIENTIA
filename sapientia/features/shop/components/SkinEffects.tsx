'use client';

import { useEffect, useRef } from 'react';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { prefersReducedMotion } from '@/shared/services/motion.service';
import { SKIN_EFFECT_COUNTS } from '../constants/skin-effects.constants';
import { shopStore } from '../services/shop.store';
import styles from '../styles/SkinEffects.module.css';

const randomIn = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Drifting pixel squares that belong to the worn skin, on a fixed layer behind the content. They are placed at random, so they are
 * built in an effect (never during render) and rebuilt whenever the skin changes. Skipped when the device asks for less motion.
 */
export function SkinEffects() {
  const skin = usePersistentStore(shopStore).equipped.skin;
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = host.current;
    const count = SKIN_EFFECT_COUNTS[skin];
    if (!layer) return undefined;
    layer.replaceChildren();
    if (!count || prefersReducedMotion()) return undefined;
    for (let i = 0; i < count; i += 1) {
      const dot = document.createElement('span');
      dot.className = styles[skin];
      dot.style.left = `${randomIn(0, 100)}%`;
      if (skin === 'royal') dot.style.top = `${randomIn(0, 62)}%`;
      if (skin === 'forest') dot.style.top = `${randomIn(35, 92)}%`;
      dot.style.setProperty('--s', `${Math.round(randomIn(2, 4))}px`);
      dot.style.setProperty('--dur', `${skin === 'royal' ? randomIn(2.5, 6) : randomIn(8, 16)}s`);
      dot.style.setProperty('--delay', `${-randomIn(0, 12)}s`);
      dot.style.setProperty('--dx', `${Math.round(randomIn(-60, 60))}px`);
      dot.style.setProperty('--dy', `${Math.round(randomIn(-120, 120))}px`);
      layer.append(dot);
    }
    return () => layer.replaceChildren();
  }, [skin]);

  return <div ref={host} className={styles.layer} aria-hidden="true" />;
}
