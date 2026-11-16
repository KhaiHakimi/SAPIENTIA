export interface ChoosePasswordMessages {
  title: string;
  subtitle: (name: string) => string;
  currentPassword: string;
  currentHelp: string;
  newPassword: string;
  newHelp: string;
  confirm: string;
  show: string;
  hide: string;
  submit: string;
  submitting: string;
  signOut: string;
  loading: string;
  /** Field reasons worded for a pupil; anything else falls back to the shared table. */
  fieldErrors: Record<string, string>;
  switchLanguage: string;
  theme: string;
}
