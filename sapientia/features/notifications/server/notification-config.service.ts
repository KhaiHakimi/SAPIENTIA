import 'server-only';
import type { EmailConfig, PushConfig } from '../interfaces/notification.interface';

/**
 * Sending settings come from environment variables only (never the repository). A channel whose variables are missing is
 * switched off rather than failing: a laptop without Mailpit or VAPID keys still runs the app and the worker.
 */

export function readEmailConfig(env: NodeJS.ProcessEnv = process.env): EmailConfig | null {
  const smtpUrl = env.SMTP_URL?.trim();
  const from = env.MAIL_FROM?.trim();
  return smtpUrl && from ? { smtpUrl, from } : null;
}

export function readPushConfig(env: NodeJS.ProcessEnv = process.env): PushConfig | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim();
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

/** Absolute links in email need the public address; the worker has no request to read it from. */
export function readAppOrigin(env: NodeJS.ProcessEnv = process.env): string | null {
  const origin = env.APP_ORIGIN?.trim();
  if (!origin) return null;
  return new URL(origin).origin;
}
