import type { Quest, QuestDoneMap } from './quest.interface';
import type { Relic } from './relic.interface';
import type { ProgressBaseline, Student, SubjectMastery } from './student.interface';

export interface QuestToggleResult {
  quest: Quest;
  nowDone: boolean;
  /** Relics this change unlocked, for the "new relic" toast and pop animation. */
  freshRelics: Relic[];
  /** The new level when this change crossed one; null otherwise. */
  levelUp: number | null;
}

export interface BattleWinResult {
  /** Only the first win over each monster per visit pays out. */
  firstWin: boolean;
  levelUp: number | null;
}

/** Everything the dashboard shows about the student's progress, plus the two things that change it. */
export interface StudentProgress {
  student: Student;
  baseline: ProgressBaseline;
  quests: readonly Quest[];
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
  classHandedIn: number;
  battleWins: readonly string[];

  toggleQuest: (questId: string) => QuestToggleResult | null;
  claimBattleWin: (monsterId: string) => BattleWinResult;
}
