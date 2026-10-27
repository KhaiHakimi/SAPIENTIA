import { PixelSprite } from '@/shared/components/PixelSprite';
import type { ShopItem } from '../interfaces/shop-item.interface';
import styles from '../styles/ShopDialog.module.css';

/** A swatch for a skin, a framed box for a frame, the sprite for an avatar. Skins and frames read their look from data attributes. */
export function ShopItemPreview({ item }: { item: ShopItem }) {
  return (
    <div className={styles.preview} aria-hidden="true">
      {item.kind === 'skin' && <div className={styles.swatch} data-skin={item.value} />}
      {item.kind === 'frame' && <div className={`${styles.framePreview} pixel-frame`} data-frame={item.value} />}
      {item.kind === 'avatar' && (
        <div className={styles.avatar}>
          <PixelSprite name={item.value} scale={5} />
        </div>
      )}
    </div>
  );
}
