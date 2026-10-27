'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { PixelButton } from '@/shared/components/PixelButton';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { ScrollDialog, scrollStyles } from '@/shared/components/ScrollDialog';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { SHOP_CATALOGUE, SHOP_KINDS } from '../data/shop-catalogue';
import { useShop } from '../hooks/useShop';
import { SHOP_MESSAGES } from '../i18n/shop.messages';
import type { ShopItem, ShopKind } from '../interfaces/shop-item.interface';
import { isEquipped, isOwned } from '../services/shop.service';
import styles from '../styles/ShopDialog.module.css';
import { ShopItemCard } from './ShopItemCard';

interface ShopDialogProps {
  open: boolean;
  onClose: () => void;
  /** The student's coin balance. */
  balance: number;
  /** A sprite avatar was chosen, so the uploaded photo should stop covering it. */
  onAvatarChosen: () => void;
}

/** The coin shop: colours, card frames and avatars. Everything is cosmetic. */
export function ShopDialog({ open, onClose, balance, onAvatarChosen }: ShopDialogProps) {
  const text = useMessages(SHOP_MESSAGES);
  const { pick } = useLanguage();
  const { state, buy, equip } = useShop();
  const [tab, setTab] = useState<ShopKind>('skin');
  const [status, setStatus] = useState('');
  const tabs = useRef<Partial<Record<ShopKind, HTMLButtonElement | null>>>({});
  const panelId = useId();

  const chooseTab = (kind: ShopKind, focus = false) => {
    setTab(kind);
    setStatus('');
    if (focus) tabs.current[kind]?.focus();
  };

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, kind: ShopKind) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    chooseTab(SHOP_KINDS[(SHOP_KINDS.indexOf(kind) + step + SHOP_KINDS.length) % SHOP_KINDS.length], true);
  };

  const onBuy = (item: ShopItem) => {
    const outcome = buy(item, balance);
    if (outcome === 'not-enough-coins') setStatus(text.notEnoughCoins);
    if (outcome !== 'bought') return;
    if (item.kind === 'avatar') onAvatarChosen();
    setStatus(text.bought(pick(item.name)));
  };

  const onEquip = (item: ShopItem) => {
    equip(item);
    if (item.kind === 'avatar') onAvatarChosen();
    setStatus(text.equipped(pick(item.name)));
  };

  return (
    <ScrollDialog
      open={open}
      onClose={onClose}
      eyebrow={text.eyebrow}
      title={text.title}
      closeLabel={text.close}
      wide
      actions={<PixelButton onClick={onClose}>{text.close}</PixelButton>}
    >
      <p className={scrollStyles.intro}>{text.intro}</p>
      <div className={styles.top}>
        <div className={styles.wallet}>
          <PixelSprite name="coin" scale={3} />
          {text.coins(balance)}
        </div>
        <p className={styles.status} role="status" aria-live="polite">
          {status}
        </p>
      </div>
      <div className={styles.tabs} role="tablist">
        {SHOP_KINDS.map((kind) => (
          <button
            key={kind}
            ref={(node) => {
              tabs.current[kind] = node;
            }}
            id={`${panelId}-${kind}`}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={tab === kind}
            aria-controls={panelId}
            tabIndex={tab === kind ? 0 : -1}
            onClick={() => chooseTab(kind)}
            onKeyDown={(event) => onTabKey(event, kind)}
          >
            {text.tabs[kind]}
          </button>
        ))}
      </div>
      <div className={styles.grid} id={panelId} role="tabpanel" aria-labelledby={`${panelId}-${tab}`}>
        {SHOP_CATALOGUE.filter((item) => item.kind === tab).map((item) => (
          <ShopItemCard
            key={item.id}
            item={item}
            name={pick(item.name)}
            owned={isOwned(state, item)}
            equipped={isEquipped(state, item)}
            affordable={balance >= item.price}
            text={text}
            onBuy={() => onBuy(item)}
            onEquip={() => onEquip(item)}
          />
        ))}
      </div>
    </ScrollDialog>
  );
}
