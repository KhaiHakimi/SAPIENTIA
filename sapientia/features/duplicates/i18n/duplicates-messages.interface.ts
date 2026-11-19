/** The "a task like this is still open" warning on the create-task form (plan Phase 6). */
export interface DuplicatesMessages {
  title: (count: number) => string;
  sentByMe: string;
  sentBy: (name: string) => string;
  due: (day: string) => string;
  shared: (count: number) => string;
  open: string;
  stillSend: string;
}
