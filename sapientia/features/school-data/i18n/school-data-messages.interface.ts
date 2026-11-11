import type { SchoolDataKind } from '../interfaces/school-data.interface';

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
  fieldErrors: Record<string, string>;
}
