export interface AcceptInviteMessages {
  title: string;
  subtitle: string;
  password: string;
  passwordHelp: string;
  confirm: string;
  show: string;
  hide: string;
  submit: string;
  submitting: string;
  missingToken: string;
  invalidLink: string;
  done: (name: string) => string;
  backToLogin: string;
  switchLanguage: string;
  theme: string;
}
