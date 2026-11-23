'use client';

import { useQuery } from '@tanstack/react-query';
import { createContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { BATTLE_BONUS_COINS, BATTLE_BONUS_XP } from '@/features/battle/constants/battle.constants';
import { fetchPupilHomework, PUPIL_HOMEWORK_KEY } from '@/features/homework/services/homework.client';
import { spentCoins } from '@/features/shop/services/shop.service';
import { shopStores } from '@/features/shop/services/shop.store';
import { usePupilStore } from '@/shared/components/PupilStoreProvider';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { SAMPLE_RELICS } from '../data/sample-relics';
import { SAMPLE_MASTERY } from '../data/sample-student';
import { useSchoolClock } from '../hooks/useSchoolClock';
import type { CelebrationLog } from '../interfaces/celebration.interface';
import type { BattleWinResult, QuestToggleResult, StudentProgress } from '../interfaces/progress.interface';
import type { Quest, QuestDoneMap, QuestsStatus } from '../interfaces/quest.interface';
import type { ProgressBaseline, Student } from '../interfaces/student.interface';
import { createCelebrationLog } from '../services/celebration.service';
import {
  currentStreak,
  guardianHpPercent,
  isGuardianDefeated,
  isQuestDone,
  isRelicEarned,
  isTodayLit,
  levelOf,
  totalCoins,
  totalXp,
  xpIntoLevel,
} from '../services/progress.service';
import { questFromHomework } from '../services/quest.service';

export const StudentProgressContext = createContext<StudentProgress | null>(null);

const relics = SAMPLE_RELICS;
const NO_QUESTS: readonly Quest[] = [];

interface StudentProgressProviderProps {
  student: Student;
  baseline: ProgressBaseline;
  children: ReactNode;
}

/**
 * Holds this visit's progress. The quests are the class's real homework (plan Sprint 12); a room is cleared for good once the
 * teacher records the hand-in. The pupil's own ticks, battle wins, XP and coins are still visit state and reset on reload, as
 * in the prototype: nothing about them is kept on the server yet. Each pupil's shop purchases are remembered in this browser
 * (see features/shop), so they are taken off the coin total here.
 */
export function StudentProgressProvider({ student, baseline, children }: StudentProgressProviderProps) {
  const homework = useQuery({ queryKey: PUPIL_HOMEWORK_KEY, queryFn: fetchPupilHomework });
  const clock = useSchoolClock(student.timeZone);
  const [done, setDone] = useState<QuestDoneMap>({});
  const [battleWins, setBattleWins] = useState<readonly string[]>([]);
  const spent = spentCoins(usePersistentStore(usePupilStore(shopStores)));
  // Only read and updated in the two handlers below, never during render.
  const celebrationLog = useRef<CelebrationLog | null>(null);
  const celebrated = () => (celebrationLog.current ??= createCelebrationLog());

  const quests = useMemo(() => homework.data?.items.map(questFromHomework) ?? NO_QUESTS, [homework.data]);
  const questsStatus: QuestsStatus = homework.data ? 'ready' : homework.isError ? 'error' : 'loading';

  const xpFor = (doneMap: QuestDoneMap, wins: number) =>
    totalXp({
      baseXp: baseline.xp, baseCoins: baseline.coins, quests, done: doneMap, battleWins: wins,
      battleBonusXp: BATTLE_BONUS_XP, battleBonusCoins: BATTLE_BONUS_COINS, spentCoins: spent,
    });

  const xp = xpFor(done, battleWins.length);
  const level = levelOf(xp);
  const todayLit = isTodayLit(quests, done);
  const earnedRelicIds = relics.filter((relic) => isRelicEarned(relic, quests, done, clock.today)).map((relic) => relic.id);

  const toggleQuest = (questId: string): QuestToggleResult | null => {
    const quest = quests.find((candidate) => candidate.id === questId);
    // The teacher's record of a hand-in is not the pupil's to undo.
    if (!quest || quest.handedIn) return null;
    const nowDone = !isQuestDone(quest, done);
    const next: QuestDoneMap = { ...done, [questId]: nowDone };
    setDone(next);
    const newlyEarned = relics.filter((relic) => !earnedRelicIds.includes(relic.id) && isRelicEarned(relic, quests, next, clock.today));
    const levelAfter = levelOf(xpFor(next, battleWins.length));
    return {
      quest,
      nowDone,
      firstTick: nowDone && celebrated().firstTick(questId),
      freshRelics: celebrated().freshRelics(newlyEarned),
      levelUp: celebrated().levelUp(level, levelAfter),
    };
  };

  const claimBattleWin = (stageKey: string): BattleWinResult => {
    if (battleWins.includes(stageKey)) return { firstWin: false, levelUp: null };
    setBattleWins((wins) => (wins.includes(stageKey) ? wins : [...wins, stageKey]));
    const levelAfter = levelOf(xpFor(done, battleWins.length + 1));
    return { firstWin: true, levelUp: celebrated().levelUp(level, levelAfter) };
  };

  const value: StudentProgress = {
    student,
    baseline,
    clock,
    quests,
    questsStatus,
    classGoal: homework.data?.classGoal ?? null,
    done,
    relics,
    mastery: SAMPLE_MASTERY,
    xp,
    level,
    xpInLevel: xpIntoLevel(xp),
    coins: totalCoins({
      baseXp: baseline.xp, baseCoins: baseline.coins, quests, done, battleWins: battleWins.length,
      battleBonusXp: BATTLE_BONUS_XP, battleBonusCoins: BATTLE_BONUS_COINS, spentCoins: spent,
    }),
    streak: currentStreak(baseline.streak, todayLit),
    todayLit,
    guardianDefeated: isGuardianDefeated(quests, done),
    guardianHpPercent: guardianHpPercent(quests, done),
    earnedRelicIds,
    battleWins,
    toggleQuest,
    claimBattleWin,
  };

  return <StudentProgressContext.Provider value={value}>{children}</StudentProgressContext.Provider>;
}
