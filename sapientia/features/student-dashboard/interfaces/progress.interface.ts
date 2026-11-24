import type { ClassGoal } from '@/features/homework/interfaces/homework.interface';
import type { Quest, QuestDoneMap, QuestsStatus } from './quest.interface';
import type { Relic } from './relic.interface';
import type { SchoolNow } from '@/shared/interfaces/school-clock.interface';
import type { ProgressBaseline, Student, SubjectMastery } from './student.interface';

export interface QuestToggleResult {
  quest: Quest;
  nowDone: boolean;
  /** True the first time this quest is ticked on this visit; the coin burst plays only then. */
  firstTick: boolean;
  /** Relics this change unlocked for the first time this visit, for the "new relic" toast and pop animation. */
  freshRelics: Relic[];
  /** The new level when this change reached one not yet celebrated this visit; null otherwise. */
  levelUp: number | null;
}

export interface BattleWinResult {
  /** Only the first win at each chapter level per visit pays out. */
  firstWin: boolean;
  levelUp: number | null;
}

/** Everything the dashboard shows about the student's progress, plus the two things that change it. */
export interface StudentProgress {
  student: Student;
  baseline: ProgressBaseline;
  /** The school's today and time of day, moving with the real clock. */
  clock: SchoolNow;
  /** The class's homework from the server; empty until questsStatus is "ready". */
  quests: readonly Quest[];
  questsStatus: QuestsStatus;
  /** The class's hand-ins this week, counts only; null while loading or when the class is too small to show it. */
  classGoal: ClassGoal | null;
  done: QuestDoneMap;
  relics: readonly Relic[];
  mastery: readonly SubjectMastery[];

  xp: number;
  level: number;
  xpInLevel: number;
  coins: number;
  streak: number;
  todayLit: boolean;
  guardianDefeated: boolean;
  guardianHpPercent: number;
  earnedRelicIds: readonly string[];
  battleWins: readonly string[];

  toggleQuest: (questId: string) => QuestToggleResult | null;
  claimBattleWin: (stageKey: string) => BattleWinResult;
}
