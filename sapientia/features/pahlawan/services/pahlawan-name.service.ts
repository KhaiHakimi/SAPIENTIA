import { createPupilStoreFamily } from '@/shared/services/pupil-store';

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

/** Each pupil's pahlawan name, under the prototype's "knight" key followed by the pupil's id. */
export const pahlawanNameStores = createPupilStoreFamily<string>({
  key: 'sapientia.knight',
  defaultValue: '',
  parse: parseName,
  serialize: (name) => JSON.stringify({ name }),
});
