import 'server-only';
import { NotFoundError } from '@/shared/server/app-errors';
import type { SchoolDataKind } from '../interfaces/school-data.interface';
import { schoolDataIdSchema, schoolDataKindSchema } from '../schemas/school-data.schemas';

/** An unknown list name is a path that does not exist: 404, like any other missing route. */
export function readKind(params: { kind: string }): SchoolDataKind {
  const parsed = schoolDataKindSchema.safeParse(params.kind);
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}

/** A malformed id cannot name a row, so it is a plain 404 rather than a database cast error. */
export function readItemId(params: { id: string }): string {
  const parsed = schoolDataIdSchema.safeParse(params.id);
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}
