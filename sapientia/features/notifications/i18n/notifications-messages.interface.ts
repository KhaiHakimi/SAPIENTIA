export interface NotificationsMessages {
  title: string;
  intro: string;
  loading: string;
  // Email
  emailHeading: string;
  emailLabel: string;
  emailHelp: string;
  emailSaved: (on: boolean) => string;
  // Push
  pushHeading: string;
  pushHelp: string;
  pushOn: string;
  pushOff: string;
  pushTurnOn: string;
  pushTurnOff: string;
  pushWorking: string;
  pushDenied: string;
  pushUnsupported: string;
  pushNotOffered: string;
  pushIosHint: string;
  pushFailed: string;
  // Install
  installHeading: string;
  installHelp: string;
  installButton: string;
  installed: string;
  installIos: string;
  installUnavailable: string;
}
