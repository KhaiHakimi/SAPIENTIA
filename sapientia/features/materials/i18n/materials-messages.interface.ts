import type { MaterialLevel } from '../interfaces/material.interface';

export interface MaterialsMessages {
  pageTitle: string;
  intro: string;
  loading: string;
  loadMore: string;
  // Filters
  filtersTitle: string;
  search: string;
  searchHelp: string;
  subject: string;
  anySubject: string;
  level: string;
  anyLevel: string;
  levels: Record<MaterialLevel, string>;
  // Adding
  openAdd: string;
  closeAdd: string;
  addTitle: string;
  addIntro: string;
  kind: string;
  kindLink: string;
  kindFile: string;
  title: string;
  url: string;
  urlHelp: string;
  file: string;
  fileHelp: string;
  topic: string;
  topicHelp: string;
  description: string;
  optional: string;
  noSubject: string;
  noLevel: string;
  add: string;
  adding: string;
  added: string;
  pictureUnreadable: string;
  // The list
  listTitle: string;
  empty: string;
  emptyFiltered: string;
  openLink: string;
  download: (kind: string, size: string) => string;
  addedBy: (name: string, when: string) => string;
  remove: string;
  removeLabel: (title: string) => string;
  fieldErrors: Record<string, string>;
}
