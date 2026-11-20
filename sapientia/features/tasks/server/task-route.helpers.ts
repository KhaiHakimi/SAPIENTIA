import 'server-only';
import { NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { idempotencyKeySchema, taskIdSchema } from '../schemas/tasks.schemas';

/** A malformed id cannot name a task, so it is a plain 404 rather than a database cast error. */
export async function readTaskId(context: { params: Promise<{ id: string }> }): Promise<string> {
  const parsed = taskIdSchema.safeParse((await context.params).id);
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}

/** The optional Idempotency-Key header, validated. */
export function readIdempotencyKey(request: Request): string | undefined {
  const header = request.headers.get('idempotency-key');
  if (header === null) return undefined;
  const parsed = idempotencyKeySchema.safeParse(header);
  if (!parsed.success) throw new ValidationError({ idempotencyKey: 'invalid_idempotency_key' });
  return parsed.data;
}
