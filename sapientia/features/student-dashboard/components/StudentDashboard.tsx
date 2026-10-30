'use client';

import { useEffect, useRef, useState } from 'react';
import type { Monster } from '@/features/characters';
import { BattleDialog } from '@/features/battle/components/BattleDialog';
import { MonsterLairCard } from '@/features/battle/components/MonsterLairCard';
import { PahlawanDialog } from '@/features/pahlawan/components/PahlawanDialog';
import { AppearanceSync } from '@/features/shop/components/AppearanceSync';
import { ShopDialog } from '@/features/shop/components/ShopDialog';
import { SkinEffects } from '@/features/shop/components/SkinEffects';
import { burstCoins } from '@/shared/feedback/coin-burst';
import { useToast } from '@/shared/feedback/ToastProvider';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { useStudentProgress } from '../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../i18n/dashboard.messages';
import { profilePhotoStore } from '../services/profile-photo.service';
import styles from '../styles/StudentDashboard.module.css';
import { ClassPartyCard } from './cards/ClassPartyCard';
import { QuestMapCard } from './cards/QuestMapCard';
import { RelicsCard } from './cards/RelicsCard';
import { SubjectMasteryCard } from './cards/SubjectMasteryCard';
import { TimetableCard } from './cards/TimetableCard';
import { TorchStreakCard } from './cards/TorchStreakCard';
import { LevelUpDialog } from './dialogs/LevelUpDialog';
import { QuestScrollDialog } from './dialogs/QuestScrollDialog';
import { WeekTimetableDialog } from './dialogs/WeekTimetableDialog';
import { Brand } from './sidebar/Brand';
import { MenuCard } from './sidebar/MenuCard';
import { ProfileCard } from './sidebar/ProfileCard';

const RELIC_TOAST_DELAY_MS = 1300;
const LEVEL_UP_DELAY_MS = 500;

/** The student home: sidebar (profile, menu) and the main grid of cards, plus every dialog they open. */
export function StudentDashboard() {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { pick } = useLanguage();
  const showToast = useToast();
  const progress = useStudentProgress();

  const [openQuestId, setOpenQuestId] = useState<string | null>(null);
  const [weekOpen, setWeekOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [pahlawanOpen, setPahlawanOpen] = useState(false);
  const [battleMonster, setBattleMonster] = useState<Monster | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [freshRelicIds, setFreshRelicIds] = useState<readonly string[]>([]);

  // Delayed feedback (relic toast, level-up) must not fire after the page is gone.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, action: () => void) => timers.current.push(setTimeout(action, ms));

  const toggleQuest = (questId: string) => {
    const result = progress.toggleQuest(questId);
    if (!result) return;
    setFreshRelicIds(result.freshRelics.map((relic) => relic.id));
    if (result.nowDone) {
      burstCoins();
      showToast(text.toastLoot(result.quest.xp, result.quest.coins));
    }
    const [firstRelic] = result.freshRelics;
    if (firstRelic) later(RELIC_TOAST_DELAY_MS, () => showToast(text.relicToast(pick(firstRelic.name))));
    const { levelUp: newLevel } = result;
    if (newLevel) later(LEVEL_UP_DELAY_MS, () => setLevelUp(newLevel));
  };

  return (
    <>
      <AppearanceSync />
      <SkinEffects />
      <div className={styles.shell}>
        <aside className={styles.side} aria-label="Sapientia">
          <Brand subtitle={text.subtitle} />
          <ProfileCard />
          <MenuCard
            onOpenWeek={() => setWeekOpen(true)}
            onOpenShop={() => setShopOpen(true)}
            onOpenPahlawan={() => setPahlawanOpen(true)}
          />
        </aside>

        <main>
          <header className={styles.pageHead}>
            <h1>{text.hello(progress.student.name)}</h1>
            <p>
              {text.dayName} • {progress.student.className}
            </p>
          </header>

          <div className={styles.grid}>
            <TorchStreakCard className={styles.areaWeek} />
            <TimetableCard className={styles.areaTime} />
            <SubjectMasteryCard className={styles.areaSkill} onFight={setBattleMonster} />
            <QuestMapCard className={styles.areaQuests} onOpenQuest={setOpenQuestId} onToggleQuest={toggleQuest} />
            <RelicsCard className={styles.areaRelics} freshRelicIds={freshRelicIds} />
            <ClassPartyCard className={styles.areaParty} />
            <MonsterLairCard className={styles.areaLair} onFight={setBattleMonster} />
          </div>

          <p className={styles.foot}>{text.footer}</p>
        </main>
      </div>

      <QuestScrollDialog questId={openQuestId} onClose={() => setOpenQuestId(null)} onToggle={toggleQuest} />
      <WeekTimetableDialog open={weekOpen} onClose={() => setWeekOpen(false)} />
      <ShopDialog
        open={shopOpen}
        onClose={() => setShopOpen(false)}
        balance={progress.coins}
        onAvatarChosen={() => profilePhotoStore.clear()}
      />
      <PahlawanDialog open={pahlawanOpen} onClose={() => setPahlawanOpen(false)} />
      <BattleDialog monster={battleMonster} onClose={() => setBattleMonster(null)} onLevelUp={setLevelUp} />
      <LevelUpDialog level={levelUp} onClose={() => setLevelUp(null)} />
    </>
  );
}
