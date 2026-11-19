/** The "draft from an instruction" panel on the create-task form (plan Phase 6). */
export interface TaskDraftsMessages {
  summary: string;
  intro: string;
  privacy: string;
  instruction: string;
  instructionHelp: string;
  makeDraft: string;
  drafting: string;
  filled: string;
  removed: (count: number) => string;
  dropped: (fields: string) => string;
  fieldNames: { description: string; dueOn: string; estimatedMinutes: string };
  placeholderNote: string;
}
