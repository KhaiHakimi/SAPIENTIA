import type { LocalizedText } from '@/shared/interfaces/localized-text.interface';
import type { SchoolSubjectKey } from '@/shared/interfaces/school-subject.interface';

export type QuestDue = 'today' | 'tomorrow' | 'friday';

/** A homework task, shown as a room on the quest map. */
export interface Quest {
  id: string;
  subject: SchoolSubjectKey;
  title: LocalizedText;
  due: QuestDue;
  xp: number;
  coins: number;
  teacher: LocalizedText;
  description: LocalizedText;
  /** What to hand in, one step per line. */
  steps: { ms: string[]; en: string[] };
  /** Already handed in before this visit; finishing it again earns nothing. */
  doneAtStart: boolean;
}

/** Which quests are marked done right now, by quest id. */
export type QuestDoneMap = Readonly<Record<string, boolean>>;
