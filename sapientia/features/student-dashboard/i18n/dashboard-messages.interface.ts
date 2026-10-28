import type { QuestDue } from '../interfaces/quest.interface';

export interface DashboardMessages {
  // Sidebar
  subtitle: string;
  profile: string;
  levelLabel: string;
  photoUpload: string;
  photoRemove: string;
  photoSaved: string;
  photoRemoved: string;
  photoBadType: string;
  photoTooBig: string;
  photoFailed: string;
  xpText: (xp: number) => string;
  xpNext: (left: number, nextLevel: number) => string;
  streak: (days: number) => string;
  coins: (count: number) => string;
  relicStat: (earned: number, total: number) => string;
  menu: string;
  sectionsLabel: string;
  switchLanguage: string;
  theme: string;
  signOut: string;
  ranks: readonly string[];

  // Page
  hello: (name: string) => string;
  dayName: string;
  footer: string;

  // Torch streak
  torchStreak: string;
  streakUnit: (days: number) => string;
  torchOff: string;
  torchOn: string;
  reminderNote: string;
  days: readonly string[];

  // Timetable
  timetable: string;
  now: string;
  relief: string;
  minutesLeft: (minutes: number) => string;
  weekButton: string;
  weekTitle: string;
  weekToday: string;
  weekIntro: string;
  daysFull: readonly string[];

  // Mastery
  mastery: string;
  suggestedHead: string;
  suggestedWhy: (subject: string, percent: number) => string;

  // Quest map
  questMap: string;
  questCount: (done: number, total: number) => string;
  room: (number: number) => string;
  due: Record<QuestDue, string>;
  cleared: string;
  markDone: string;
  undo: string;
  viewDetails: string;
  guardianName: string;
  guardianHp: (percent: number) => string;
  guardianSealed: string;
  guardianDown: (bonus: number) => string;

  // Quest scroll
  scrollFrom: string;
  scrollDue: string;
  scrollReward: string;
  scrollMessage: string;
  scrollHandIn: string;
  close: string;

  // Relics and class
  relics: string;
  locked: string;
  earned: string;
  party: string;
  partyText: (handedIn: number, total: number) => string;
  partyNote: string;

  // Feedback
  toastLoot: (xp: number, coins: number) => string;
  relicToast: (name: string) => string;
  levelUpTitle: (level: number) => string;
  levelUpText: (rank: string) => string;
  continue: string;
}
