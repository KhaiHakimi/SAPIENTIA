import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DELIVERY_MESSAGES } from '@/features/delivery/i18n/delivery.messages';
import { EXTENSIONS_MESSAGES } from '@/features/extensions/i18n/extensions.messages';
import { HOURS_MESSAGES } from '@/features/hours/i18n/hours.messages';
import { LESSONS_MESSAGES } from '@/features/lessons/i18n/lessons.messages';
import { RELIEF_MESSAGES } from '@/features/relief/i18n/relief.messages';
import { REPORTS_MESSAGES } from '@/features/reports/i18n/reports.messages';
import { SCHOOL_DATA_MESSAGES } from '@/features/school-data/i18n/school-data.messages';
import { TASKS_MESSAGES } from '@/features/tasks/i18n/tasks.messages';
import { TIMETABLE_MESSAGES } from '@/features/timetable/i18n/timetable.messages';
import { API_ERROR_MESSAGES } from './api-error.messages';

/**
 * i18n audit (plan Sprint 5): every reason code the server can put on a field has text in both languages, so no form ever
 * falls back to a code or to one language. Codes are read from the source: Zod `error: '...'` options and ValidationError
 * calls. Feature pages may word a code more specifically; the shared table is the fallback.
 */
const root = fileURLToPath(new URL('../../', import.meta.url));

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(path);
    return /\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) && !/messages/.test(entry.name) ? [path] : [];
  });
}

function serverReasonCodes(): string[] {
  const codes = new Set<string>();
  for (const file of [...sourceFiles(join(root, 'features')), ...sourceFiles(join(root, 'shared'))]) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\berror: '([a-z_]+)'/g)) codes.add(match[1]);
    for (const match of text.matchAll(/ValidationError\(\{ ?[\w.]+: '([a-z_]+)'/g)) codes.add(match[1]);
  }
  return [...codes].sort();
}

const featureFieldTexts = [
  DELIVERY_MESSAGES, TASKS_MESSAGES, SCHOOL_DATA_MESSAGES, TIMETABLE_MESSAGES, EXTENSIONS_MESSAGES, RELIEF_MESSAGES, LESSONS_MESSAGES,
  HOURS_MESSAGES, REPORTS_MESSAGES,
];

describe('API error messages', () => {
  it('has the same codes and field reasons in Bahasa Melayu and English', () => {
    expect(Object.keys(API_ERROR_MESSAGES.en.codes).sort()).toEqual(Object.keys(API_ERROR_MESSAGES.ms.codes).sort());
    expect(Object.keys(API_ERROR_MESSAGES.en.fields).sort()).toEqual(Object.keys(API_ERROR_MESSAGES.ms.fields).sort());
  });

  it('feature field texts have the same keys in both languages', () => {
    for (const messages of featureFieldTexts) {
      expect(Object.keys(messages.en.fieldErrors).sort()).toEqual(Object.keys(messages.ms.fieldErrors).sort());
    }
  });

  it.each(serverReasonCodes())('the reason %s has text in both languages', (code) => {
    for (const lang of ['ms', 'en'] as const) {
      const known = code in API_ERROR_MESSAGES[lang].fields || featureFieldTexts.some((messages) => code in messages[lang].fieldErrors);
      expect(known, `${code} (${lang})`).toBe(true);
    }
  });
});
