import { PixelButton } from '@/shared/components/PixelButton';
import { PixelSprite } from '@/shared/components/PixelSprite';
import type { ShopItem } from '../interfaces/shop-item.interface';
import type { ShopMessages } from '../i18n/shop-messages.interface';
import styles from '../styles/ShopDialog.module.css';
import { ShopItemPreview } from './ShopItemPreview';

interface ShopItemCardProps {
  item: ShopItem;
  name: string;
  owned: boolean;
  equipped: boolean;
  affordable: boolean;
  text: ShopMessages;
  onBuy: () => void;
  onEquip: () => void;
}

export function ShopItemCard({ item, name, owned, equipped, affordable, text, onBuy, onEquip }: ShopItemCardProps) {
  const label = equipped ? text.inUse : owned ? text.use : text.buy;
  return (
    <div className={[styles.item, equipped && styles.on].filter(Boolean).join(' ')}>
      <ShopItemPreview item={item} />
      <b className={styles.itemName}>{name}</b>
      <div className={styles.price}>
        {item.price === 0 && text.free}
        {item.price > 0 && !owned && (
          <>
            {item.price}
            <PixelSprite name="coin" scale={2} />
          </>
        )}
        {!owned && !affordable && <span className={styles.short}>{text.notEnoughCoins}</span>}
      </div>
      <PixelButton
        size="small"
        variant={owned ? 'ghost' : 'primary'}
        disabled={equipped || (!owned && !affordable)}
        aria-label={`${label}: ${name}`}
        onClick={owned ? onEquip : onBuy}
      >
        {label}
      </PixelButton>
    </div>
  );
}
