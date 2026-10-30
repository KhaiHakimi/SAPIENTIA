import 'server-only';
import { z } from 'zod';
import { ValidationError } from './app-errors';

export const PAGE_DEFAULT = 25;
export const PAGE_MAX = 100;

/** ?limit=&cursor= for list endpoints: default 25, at most 100 (plan Sprint 3). */
export const pageQuerySchema = z.object({
  limit: z.coerce.number({ error: 'invalid_number' }).int({ error: 'invalid_number' })
    .min(1, { error: 'too_small' }).max(PAGE_MAX, { error: 'too_large' }).default(PAGE_DEFAULT),
  cursor: z.string().max(500, { error: 'invalid_cursor' }).optional(),
});

/**
 * Opaque keyset cursor: the sort value and id of the last row on the page, so the next page starts after it even when rows
 * are added meanwhile. The client must not build or read it.
 */
export function encodeCursor(sortValue: string, id: string): string {
  return Buffer.from(JSON.stringify([sortValue, id]), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string | undefined): { sortValue: string; id: string } | null {
  if (!cursor) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Array.isArray(parsed) && parsed.length === 2 && parsed.every((part) => typeof part === 'string')) {
      return { sortValue: parsed[0], id: parsed[1] };
    }
  } catch {
    // Falls through to the validation error below.
  }
  throw new ValidationError({ cursor: 'invalid_cursor' });
}

/** Rows are fetched with limit + 1; the extra row only says whether another page exists. */
export function toPage<R, T>(rows: R[], limit: number, map: (row: R) => T, cursorOf: (row: R) => string) {
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return { items: items.map(map), nextCursor: rows.length > limit && last ? cursorOf(last) : null };
}
