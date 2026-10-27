import { prefersReducedMotion } from '@/shared/services/motion.service';
import styles from './CoinBurst.module.css';

const COIN_COUNT = 24;

/** A shower of pixel coins after a reward. Skipped when the device asks for less motion. Each coin removes itself when it lands. */
export function burstCoins(): void {
  if (prefersReducedMotion()) return;
  for (let i = 0; i < COIN_COUNT; i += 1) {
    const piece = document.createElement('span');
    piece.className = i % 6 === 0 ? `${styles.coin} ${styles.ember}` : styles.coin;
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 200)}px`);
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    piece.setAttribute('aria-hidden', 'true');
    document.body.append(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}
