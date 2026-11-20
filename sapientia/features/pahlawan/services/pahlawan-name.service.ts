import { createPersistentStore } from '@/shared/services/persistent-store';

const MAX_NAME_LENGTH = 12;

/** Names are shown in the battle and typed by the student, so keep them short plain text with no control characters or angle brackets. */
export function cleanPahlawanName(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

function parseName(raw: string | null): string {
  if (!raw) return '';
  try {
    const saved: unknown = JSON.parse(raw);
    return saved && typeof saved === 'object' ? cleanPahlawanName((saved as { name?: unknown }).name) : '';
  } catch {
    return '';
  }
}

/** The pahlawan's name. Stored under the prototype's "knight" key, so a name saved there still loads. */
export const pahlawanNameStore = createPersistentStore<string>({
  key: 'sapientia.knight',
  defaultValue: '',
  parse: parseName,
  serialize: (name) => JSON.stringify({ name }),
});
