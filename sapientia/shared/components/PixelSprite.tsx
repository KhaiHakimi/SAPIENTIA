import { PIXEL_PALETTE, PIXEL_SPRITES, type PixelSpriteName } from '@/shared/sprites/pixel-sprites';
import styles from './PixelSprite.module.css';

interface PixelSpriteProps {
  name: PixelSpriteName;
  /** Screen pixels per sprite pixel. */
  scale?: number;
  className?: string;
}

interface Run {
  x: number;
  y: number;
  width: number;
  colour: string;
}

// Same-colour runs in a row become one rect, so a sprite is a handful of nodes and scales crisply.
function toRuns(rows: readonly string[]): Run[] {
  const runs: Run[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const letter = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === letter) end += 1;
      if (letter !== '.') runs.push({ x, y, width: end - x, colour: PIXEL_PALETTE[letter] });
      x = end;
    }
  });
  return runs;
}

/** Decorative pixel icon; meaning is always given in text next to it, so it is hidden from assistive tech. */
export function PixelSprite({ name, scale = 3, className }: PixelSpriteProps) {
  const rows = PIXEL_SPRITES[name];
  const width = rows[0].length;
  const height = rows.length;
  return (
    <svg
      className={className ? `${styles.sprite} ${className}` : styles.sprite}
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {toRuns(rows).map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.width} height={1} fill={run.colour} />
      ))}
    </svg>
  );
}
