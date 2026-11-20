import type { TimeTaken } from '@/features/tasks/interfaces/task.interface';
import type { SchoolDataKind } from '../interfaces/school-data.interface';
import type { FeedbackVerdict } from '../services/time-feedback';

export interface SchoolDataListMessages {
  title: string;
  intro: string;
  nameLabel: string;
  namePlaceholder: string;
  empty: string;
}

export interface SchoolDataMessages {
  pageTitle: string;
  pageIntro: string;
  lists: Record<SchoolDataKind, SchoolDataListMessages>;
  estimateLabel: string;
  estimateHelp: string;
  minutes: (count: number) => string;
  add: string;
  adding: string;
  remove: string;
  removing: string;
  removeLabel: (name: string) => string;
  loading: string;
  columns: { name: string; estimate: string; actions: string };
  /** Answers to the completion question, counted per task type. */
  feedback: {
    title: string;
    intro: string;
    empty: (minAnswers: number) => string;
    columns: { type: string; verdict: string };
    options: Record<TimeTaken, string>;
    verdicts: Record<FeedbackVerdict, string>;
  };
  fieldErrors: Record<string, string>;
}
