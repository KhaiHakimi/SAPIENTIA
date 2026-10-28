import type { LoginFieldError } from '../interfaces/account.interface';

export interface LoginPillar {
  title: string;
  description: string;
}

export interface LoginMessages {
  // Showcase panel
  portalSubtitle: string;
  panelTitle: string;
  leadDesc: string;
  pillars: readonly [LoginPillar, LoginPillar, LoginPillar];
  metaPrototype: string;
  metaAffiliation: string;

  // Card
  title: string;
  subtitle: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  show: string;
  hide: string;
  forgot: string;
  forgotInfo: string;
  submit: string;
  submitting: string;
  fieldErrors: Record<LoginFieldError, string>;
  badCredentials: string;
  note: string;
  demoBadge: string;

  // Demo accounts
  demoTitle: string;
  demoIntro: string;
  passwordShort: string;
  studentRole: string;
  teacherRole: string;
  use: string;
  useAccount: (who: string) => string;
  filled: (who: string) => string;

  // After sign-in
  successTitle: string;
  studentOpening: (name: string) => string;
  teacherWelcome: (name: string) => string;
  teacherNoBoard: string;
  signOut: string;

  // Corner tools
  switchLanguage: string;
  theme: string;
}
