import Image from 'next/image';
import type { Character } from '../interfaces/character.interface';
import styles from '../styles/CharacterPortrait.module.css';

interface CharacterPortraitProps {
  character: Character;
  /** Square box in CSS pixels; the picture is fitted inside, standing on the bottom edge. */
  size: number;
  /** Faint light rim so the dark outline still reads at icon size on dark panels. */
  rim?: boolean;
  className?: string;
}

/** The large still picture of a character. Decorative: the name is always written next to it. */
export function CharacterPortrait({ character, size, rim = false, className }: CharacterPortraitProps) {
  return (
    <Image
      src={character.portrait}
      alt=""
      width={size}
      height={size}
      // Pixel art: served as drawn, never re-encoded.
      unoptimized
      className={[styles.portrait, rim && styles.rim, className].filter(Boolean).join(' ')}
    />
  );
}
