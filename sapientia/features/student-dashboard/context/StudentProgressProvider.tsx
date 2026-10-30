'use client';

import { createContext, useState, type ReactNode } from 'react';
import { BATTLE_BONUS_COINS, BATTLE_BONUS_XP } from '@/features/battle/constants/battle.constants';
import { spentCoins } from '@/features/shop/services/shop.service';
import { shopStore } from '@/features/shop/services/shop.store';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { SAMPLE_QUESTS } from '../data/sample-quests';
import { SAMPLE_RELICS } from '../data/sample-relics';
import { SAMPLE_MASTERY } from '../data/sample-student';
import type { BattleWinResult, QuestToggleResult, StudentProgress } from '../interfaces/progress.interface';
import type { QuestDoneMap } from '../interfaces/quest.interface';
import type { ProgressBaseline, Student } from '../interfaces/student.interface';
import {
  currentStreak,
  guardianHpPercent,
  isGuardianDefeated,
  isQuestDone,
  isRelicEarned,
  isTodayLit,
  levelOf,
  newlyDone,
  totalCoins,
  totalXp,
  xpIntoLevel,
} from '../services/progress.service';

export const StudentProgressContext = createContext<StudentProgress | null>(null);

const quests = SAMPLE_QUESTS;
const relics = SAMPLE_RELICS;

interface StudentProgressProviderProps {
  student: Student;
  baseline: ProgressBaseline;
  children: ReactNode;
}

/**
 * Holds this visit's progress. Quest ticks and battle wins are demo state and reset on reload, as in the prototype; the real
 * values will come from the API. Shop purchases are remembered (see features/shop), so they are taken off the coin total here.
 * The student and their starting numbers come from the signed-in mock account (features/auth).
 */
export function StudentProgressProvider({ student, baseline, children }: StudentProgressProviderProps) {
  const [done, setDone] = useState<QuestDoneMap>({});
  const [battleWins, setBattleWins] = useState<readonly string[]>([]);
  const spent = spentCoins(usePersistentStore(shopStore));

  const xpFor = (doneMap: QuestDoneMap, wins: number) =>
    totalXp({
      baseXp: baseline.xp, baseCoins: baseline.coins, quests, done: doneMap, battleWins: wins,
      battleBonusXp: BATTLE_BONUS_XP, battleBonusCoins: BATTLE_BONUS_COINS, spentCoins: spent,
    });

  const xp = xpFor(done, battleWins.length);
  const level = levelOf(xp);
  const todayLit = isTodayLit(quests, done);
  const earnedRelicIds = relics.filter((relic) => isRelicEarned(relic, quests, done)).map((relic) => relic.id);

  const toggleQuest = (questId: string): QuestToggleResult | null => {
    const quest = quests.find((candidate) => candidate.id === questId);
    if (!quest) return null;
    const nowDone = !isQuestDone(quest, done);
    const next: QuestDoneMap = { ...done, [questId]: nowDone };
    setDone(next);
    const freshRelics = relics.filter((relic) => !earnedRelicIds.includes(relic.id) && isRelicEarned(relic, quests, next));
    const levelAfter = levelOf(xpFor(next, battleWins.length));
    return { quest, nowDone, freshRelics, levelUp: levelAfter > level ? levelAfter : null };
  };

  const claimBattleWin = (monsterId: string): BattleWinResult => {
    if (battleWins.includes(monsterId)) return { firstWin: false, levelUp: null };
    setBattleWins((wins) => (wins.includes(monsterId) ? wins : [...wins, monsterId]));
    const levelAfter = levelOf(xpFor(done, battleWins.length + 1));
    return { firstWin: true, levelUp: levelAfter > level ? levelAfter : null };
  };

  const value: StudentProgress = {
    student,
    baseline,
    quests,
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
    classHandedIn: baseline.classHandedIn + newlyDone(quests, done).length,
    battleWins,
    toggleQuest,
    claimBattleWin,
  };

  return <StudentProgressContext.Provider value={value}>{children}</StudentProgressContext.Provider>;
}
