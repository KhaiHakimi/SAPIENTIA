import type { PupilHomework } from '@/features/homework/interfaces/homework.interface';
import { QUEST_COINS, QUEST_XP } from '../constants/board.constants';
import type { DueStatus, Quest } from '../interfaces/quest.interface';
import { daysBetween } from '@/shared/services/school-clock.service';

/** A piece of the class's homework as a room on the quest map. */
export function questFromHomework(homework: PupilHomework): Quest {
  return {
    id: homework.id,
    subjectName: homework.subjectName,
    title: homework.title,
    teacherName: homework.teacherName,
    details: homework.details,
    dueOn: homework.dueOn,
    xp: QUEST_XP,
    coins: QUEST_COINS,
    handedIn: homework.handedIn,
    comments: homework.comments,
  };
}

/** Where a due date stands against the school's today. */
export function dueStatus(dueOn: string, today: string): DueStatus {
  const days = daysBetween(today, dueOn);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  return days === 1 ? 'tomorrow' : 'later';
}
