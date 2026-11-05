import type { SendFailureKind } from '../interfaces/notification.interface';

/** A send that did not go through, sorted by what to do next. The senders throw only this. */
export class SendFailure extends Error {
  constructor(
    readonly kind: SendFailureKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SendFailure';
  }
}

export const isTemporary = (error: unknown): boolean => error instanceof SendFailure && error.kind === 'temporary';
