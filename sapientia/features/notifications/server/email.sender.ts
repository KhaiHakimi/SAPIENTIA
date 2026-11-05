import 'server-only';
import nodemailer from 'nodemailer';
import { DeadlineError, withDeadline, withRetry } from '@/shared/server/external-call.service';
import { SEND_DEADLINE_MS, SEND_RETRY, SOCKET_TIMEOUT_MS } from '../constants/notification.constants';
import type { EmailConfig, EmailMessage, EmailSender } from '../interfaces/notification.interface';
import { isTemporary, SendFailure } from './send-failure';

/** SMTP reply 5xx is a refusal (bad address, rejected content); 4xx and connection trouble are worth another try. */
function classify(error: unknown): SendFailure {
  if (error instanceof DeadlineError) return new SendFailure('temporary', 'email: no answer in time');
  const responseCode = (error as { responseCode?: unknown })?.responseCode;
  if (typeof responseCode === 'number' && responseCode >= 500) {
    return new SendFailure('permanent', `email: refused (${responseCode})`, responseCode);
  }
  const code = (error as { code?: unknown })?.code;
  return new SendFailure('temporary', `email: ${typeof code === 'string' ? code : 'failed'}`, typeof responseCode === 'number' ? responseCode : undefined);
}

/** SMTP through SMTP_URL (Mailpit locally). One pooled connection, with every wait capped. */
export function createEmailSender(config: EmailConfig): EmailSender {
  const transport = nodemailer.createTransport({
    url: config.smtpUrl,
    pool: true,
    maxConnections: 1,
    connectionTimeout: SOCKET_TIMEOUT_MS,
    greetingTimeout: SOCKET_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
  });
  return {
    async send(message: EmailMessage): Promise<void> {
      await withRetry(async () => {
        try {
          await withDeadline(transport.sendMail({ from: config.from, ...message }), SEND_DEADLINE_MS);
        } catch (error) {
          throw classify(error);
        }
      }, { ...SEND_RETRY, shouldRetry: isTemporary });
    },
  };
}
