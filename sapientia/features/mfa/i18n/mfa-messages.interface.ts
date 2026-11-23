/** Two-step sign-in: the security page, the setup an administrator may be required to finish, and the sign-in code step. */
export interface MfaMessages {
  title: string;
  intro: string;
  loading: string;
  unavailable: string;
  statusOn: (codesLeft: number) => string;
  statusOff: string;
  requiredTitle: string;
  requiredIntro: string;

  startTitle: string;
  startIntro: string;
  password: string;
  start: string;
  keyTitle: string;
  keyHelp: string;
  keyLabel: string;
  openInApp: string;
  code: string;
  codeHelp: string;
  confirm: string;
  cancel: string;

  recoveryTitle: string;
  recoveryIntro: string;
  recoveryPrint: string;
  recoveryDone: string;

  manageTitle: string;
  newCodes: string;
  newCodesHelp: string;
  disable: string;
  disableHelp: string;
  disabled: string;

  adminTitle: string;
  adminRequire: string;
  adminHelp: string;
  /** The rule changes only after the administrator's password is entered again. */
  adminPasswordHelp: string;
  adminSave: string;
  saved: string;

  signInTitle: string;
  signInIntro: string;
  useRecovery: string;
  useApp: string;
  recoveryCode: string;
  verify: string;
  verifying: string;
  back: string;
  expired: string;

  /** Field reasons worded for these screens; anything else falls back to the shared table. */
  fieldErrors: Record<string, string>;
}
