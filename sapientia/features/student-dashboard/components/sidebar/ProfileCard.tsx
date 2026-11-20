'use client';

import { useRef, type ChangeEvent } from 'react';
import { shopStore } from '@/features/shop/services/shop.store';
import { PixelButton } from '@/shared/components/PixelButton';
import { PixelCard } from '@/shared/components/PixelCard';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { SegmentedBar } from '@/shared/components/SegmentedBar';
import { useToast } from '@/shared/feedback/ToastProvider';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { useMessages } from '@/shared/i18n/useLanguage';
import { XP_PER_LEVEL } from '../../constants/progress.constants';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import { checkPhotoFile, profilePhotoStore, squarePhoto } from '../../services/profile-photo.service';
import { rankIndex } from '../../services/progress.service';
import styles from '../../styles/Sidebar.module.css';

/** The student's avatar (an uploaded photo or the avatar bought in the shop), level, XP and headline stats. */
export function ProfileCard() {
  const text = useMessages(DASHBOARD_MESSAGES);
  const showToast = useToast();
  const progress = useStudentProgress();
  const photo = usePersistentStore(profilePhotoStore);
  const avatar = usePersistentStore(shopStore).equipped.avatar;
  const fileInput = useRef<HTMLInputElement>(null);
  const xpTitleId = 'profile-xp';

  const onPhotoChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // so choosing the same file again still fires a change
    if (!file) return;
    const problem = checkPhotoFile(file);
    if (problem) {
      showToast(problem === 'bad-type' ? text.photoBadType : text.photoTooBig);
      return;
    }
    try {
      profilePhotoStore.set(await squarePhoto(file));
      showToast(text.photoSaved);
    } catch {
      showToast(text.photoFailed);
    }
  };

  const { level, xpInLevel } = progress;
  const percent = Math.round((xpInLevel / XP_PER_LEVEL) * 100);
  const earned = progress.earnedRelicIds.length;

  return (
    <PixelCard title={text.profile} icon="mage">
      <div className={styles.player}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar} aria-hidden="true">
            {/* A data URL made by this page; next/image adds nothing for it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo ? <img src={photo} alt="" /> : <PixelSprite name={avatar} scale={5} />}
          </div>
          <div className={styles.levelBadge} role="img" aria-label={`${text.levelLabel} ${level}`}>
            <b>{level}</b>
          </div>
        </div>
        <div>
          <p className={styles.name}>{progress.student.name}</p>
          <p className={styles.rank}>{text.ranks[rankIndex(level, text.ranks.length)]}</p>
          <p className={styles.rankSub}>{progress.student.className}</p>
        </div>
      </div>
      <div className={styles.photoRow}>
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPhotoChosen} />
        <PixelButton variant="ghost" className={styles.photoButton} onClick={() => fileInput.current?.click()}>
          {text.photoUpload}
        </PixelButton>
        {photo && (
          <PixelButton
            variant="ghost"
            className={styles.photoButton}
            onClick={() => {
              profilePhotoStore.clear();
              showToast(text.photoRemoved);
            }}
          >
            {text.photoRemove}
          </PixelButton>
        )}
      </div>
      <div className={styles.xpBlock}>
        <div className={styles.xpMeta}>
          <span id={xpTitleId}>{text.xpText(xpInLevel)}</span>
          <span>{text.xpNext(XP_PER_LEVEL - xpInLevel, level + 1)}</span>
        </div>
        <SegmentedBar percent={percent} aria-labelledby={xpTitleId} />
      </div>
      <div className={styles.stats}>
        <span className={styles.stat}>
          <PixelSprite name="flame" scale={2} />
          {text.streak(progress.streak)}
        </span>
        <span className={styles.stat}>
          <PixelSprite name="coin" scale={2} />
          {text.coins(progress.coins)}
        </span>
        <span className={styles.stat}>
          <PixelSprite name="trophy" scale={2} />
          {text.relicStat(earned, progress.relics.length)}
        </span>
      </div>
    </PixelCard>
  );
}
