import type { DueStatus } from '../interfaces/quest.interface';

export interface DashboardMessages {
  // Sidebar
  subtitle: string;
  profile: string;
  levelLabel: string;
  photoUpload: string;
  photoRemove: string;
  photoSaved: string;
  /** The browser would not keep the photo (private mode or full storage); it shows only until a reload. */
  photoNotKept: string;
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
  timetableLoading: string;
  timetableError: string;
  noLessonsToday: string;
  noLessons: string;
  dayOff: string;
  weekButton: string;
  weekTitle: string;
  weekToday: string;
  weekIntro: string;
  weekPrevious: string;
  weekNext: string;
  weekRange: (from: string, to: string) => string;

  // Mastery
  mastery: string;
  suggestedHead: string;
  suggestedWhy: (subject: string, percent: number) => string;

  // Quest map
  questMap: string;
  questCount: (done: number, total: number) => string;
  room: (number: number) => string;
  /** day is the due date written out, for "later" and "overdue". */
  due: (status: DueStatus, day: string) => string;
  cleared: string;
  handedIn: string;
  questsLoading: string;
  questsError: string;
  questsEmpty: string;
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
  scrollNoDetails: string;
  scrollHandIn: string;
  scrollHandInNote: string;
  scrollHandedIn: string;
  scrollComments: (teacherName: string) => string;
  close: string;

  // Relics and class
  relics: string;
  locked: string;
  earned: string;
  party: string;
  partyText: (handedIn: number, total: number) => string;
  partyNote: string;
  partyNone: string;
  partyHidden: string;
  reminderTitle: string;
  reminderText: (count: number, day: string) => string;

  // Feedback
  toastLoot: (xp: number, coins: number) => string;
  relicToast: (name: string) => string;
  levelUpTitle: (level: number) => string;
  levelUpText: (rank: string) => string;
  continue: string;
}
