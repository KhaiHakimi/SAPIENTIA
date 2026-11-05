/** Body of GET /api/me/notifications. */
export interface NotificationSettings {
  /** Email when a task reaches me. */
  email: boolean;
  push: {
    /** False when the server has no VAPID keys; the page then hides the push switch. */
    available: boolean;
    publicKey: string | null;
  };
}

export interface NotificationSettingsPatch {
  email: boolean;
}

/** What a browser's PushSubscription.toJSON() gives, as POSTed to /api/me/push-subscriptions. */
export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Everything a "task reached you" message says. Built by the worker once the delivery is saved. */
export interface TaskNotice {
  taskId: string;
  title: string;
  /** YYYY-MM-DD in the school's calendar. */
  dueOn: string;
  senderName: string;
  recipientName: string;
  /** Absolute link to the task, or null when APP_ORIGIN is not set (the worker has no request to take it from). */
  link: string | null;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** The JSON the service worker (public/sw.js) reads from a push. url is always a same-site path. */
export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export interface PushSender {
  send(subscription: PushSubscriptionInput, payload: PushPayload): Promise<void>;
}

/** The worker's outside connections. Either is null when not configured, and that channel is skipped. */
export interface NotificationSenders {
  email: EmailSender | null;
  push: PushSender | null;
}

/** gone: the push subscription no longer exists (delete it). temporary: try again later. permanent: retrying will not help. */
export type SendFailureKind = 'gone' | 'temporary' | 'permanent';

export interface EmailConfig {
  smtpUrl: string;
  from: string;
}

export interface PushConfig {
  publicKey: string;
  privateKey: string;
  /** mailto: or https: contact for the push services (VAPID "sub"). */
  subject: string;
}

export interface NotifyResult {
  sent: number;
  /** Temporary failures; the job is retried later and sends only these. */
  failed: number;
}
