import type { ClassDay } from '@/features/timetable/interfaces/timetable.interface';
import { REMINDER_FROM_MINUTES, REMINDER_UNTIL_MINUTES } from '../constants/board.constants';
import type { Quest, QuestDoneMap } from '../interfaces/quest.interface';
import { isQuestDone } from './progress.service';

/** Whether the board may show the reminder now: 2 pm to 6 pm school time only. */
export function isReminderTime(minutes: number): boolean {
  return minutes >= REMINDER_FROM_MINUTES && minutes < REMINDER_UNTIL_MINUTES;
}

/** The first school day after today in these days (this week and next), or null: Friday's reminder is for Monday's work. */
export function nextSchoolDay(today: string, days: readonly ClassDay[]): string | null {
  return days.filter((day) => day.date > today && day.schoolDay).map((day) => day.date).sort()[0] ?? null;
}

/** Homework due that day that the teacher has not received and the pupil has not ticked off. */
export function questsToRemind(quests: readonly Quest[], done: QuestDoneMap, dueOn: string): Quest[] {
  return quests.filter((quest) => quest.dueOn === dueOn && !isQuestDone(quest, done));
}
