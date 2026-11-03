'use client';

import type { ReactNode } from 'react';
import { useSignOut } from '@/features/auth/hooks/useSession';
import { CharacterPortrait } from '@/features/characters/components/CharacterPortrait';
import { BATTLE_MESSAGES } from '@/features/battle/i18n/battle.messages';
import { usePahlawanCharacter } from '@/features/pahlawan/hooks/usePahlawanCharacter';
import { PAHLAWAN_MESSAGES } from '@/features/pahlawan/i18n/pahlawan.messages';
import { SHOP_MESSAGES } from '@/features/shop/i18n/shop.messages';
import { PixelCard } from '@/shared/components/PixelCard';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { PixelSpriteName } from '@/shared/sprites/pixel-sprites';
import { toggleTheme } from '@/shared/theme/theme.store';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import styles from '../../styles/Sidebar.module.css';

interface MenuCardProps {
  onOpenWeek: () => void;
  onOpenShop: () => void;
  onOpenPahlawan: () => void;
}

function Icon({ name }: { name: PixelSpriteName }) {
  return (
    <span className={styles.navIcon} aria-hidden="true">
      <PixelSprite name={name} scale={name === 'coin' ? 3 : 2} />
    </span>
  );
}

function Row({ href, onClick, icon, children }: { href?: string; onClick?: () => void; icon: ReactNode; children: ReactNode }) {
  const content = (
    <>
      {icon}
      <span>{children}</span>
    </>
  );
  return href ? (
    <a href={href}>{content}</a>
  ) : (
    <button type="button" aria-haspopup="dialog" onClick={onClick}>
      {content}
    </button>
  );
}

/** Section links and the buttons that open the weekly timetable, shop and Pahlawan Saya, then language, theme and sign out. */
export function MenuCard({ onOpenWeek, onOpenShop, onOpenPahlawan }: MenuCardProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const battleText = useMessages(BATTLE_MESSAGES);
  const shopText = useMessages(SHOP_MESSAGES);
  const pahlawanText = useMessages(PAHLAWAN_MESSAGES);
  const hero = usePahlawanCharacter();
  const { toggleLang } = useLanguage();
  const signOut = useSignOut();

  return (
    <PixelCard title={text.menu} icon="key">
      <nav className={styles.nav} aria-label={text.sectionsLabel}>
        <Row href="#week" icon={<Icon name="flame" />}>{text.torchStreak}</Row>
        <Row href="#quests" icon={<Icon name="door" />}>{text.questMap}</Row>
        <Row href="#lair" icon={<Icon name="skull" />}>{battleText.lairTitle}</Row>
        <Row onClick={onOpenWeek} icon={<Icon name="scroll" />}>{text.weekButton}</Row>
        <Row onClick={onOpenShop} icon={<Icon name="coin" />}>{shopText.title}</Row>
        <Row
          onClick={onOpenPahlawan}
          icon={
            <span className={styles.navIcon} aria-hidden="true">
              <CharacterPortrait character={hero} size={26} rim />
            </span>
          }
        >
          {pahlawanText.menuLabel}
        </Row>
        <Row href="#relics" icon={<Icon name="crown" />}>{text.relics}</Row>
        <Row href="#mastery" icon={<Icon name="owl" />}>{text.mastery}</Row>
        <Row href="#party" icon={<Icon name="squire" />}>{text.party}</Row>
      </nav>
      <div className={styles.tools}>
        <button className={`${styles.toolButton} px`} type="button" aria-label={text.switchLanguage} onClick={toggleLang}>
          BM | EN
        </button>
        <button className={`${styles.toolButton} px`} type="button" onClick={toggleTheme}>
          {text.theme}
        </button>
        <button className={`${styles.toolButton} ${styles.signOut} px`} type="button" onClick={signOut}>
          {text.signOut}
        </button>
      </div>
    </PixelCard>
  );
}
