import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The private hours log is readable only by its owner (plan Phase 3, gate G5). The refusal tests show the endpoints refuse
 * everyone else; this test shows there is no other way in. It reads the source: only the hours repository may name the
 * log's tables, and every statement there must filter on, or insert, the school and the owner together. The one exception
 * is the monthly report's read of shared totals: private_hours_shares only, for one school and one month.
 */
const root = fileURLToPath(new URL('../../../', import.meta.url));
const TABLES = /\bprivate_hours_(log|shares)\b/;
const REPOSITORY = ['features', 'hours', 'server', 'hours.repository.ts'].join(sep);
/** The test kit empties every table between integration tests; it reads nothing. */
const ALLOWED = new Set([REPOSITORY, ['shared', 'server', 'testing', 'api-test-kit.ts'].join(sep)]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name.startsWith('.') ? [] : sourceFiles(path);
    return /\.(ts|tsx|mjs|js)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [path] : [];
  });
}

const isOwnerScoped = (sql: string) =>
  /^\s*INSERT INTO private_hours_\w+ \(school_id, user_id,/.test(sql) || /WHERE school_id = \$1 AND user_id = \$2/.test(sql);

describe('private hours log isolation', () => {
  it('is named in the hours repository only', () => {
    const touching = ['app', 'features', 'shared', 'worker', 'scripts', 'seeds']
      .flatMap((folder) => sourceFiles(join(root, folder)))
      .filter((file) => TABLES.test(readFileSync(file, 'utf8')))
      .map((file) => relative(root, file));
    expect(touching.filter((file) => !ALLOWED.has(file))).toEqual([]);
    expect(touching).toContain(REPOSITORY);
  });

  it('filters every statement on the school and the owner', () => {
    const source = readFileSync(join(root, REPOSITORY), 'utf8');
    const statements = [...source.matchAll(/`([^`]*)`|'([^'\n]*)'/g)]
      .map((match) => match[1] ?? match[2])
      .filter((text) => TABLES.test(text));
    expect(statements.length).toBeGreaterThanOrEqual(8);
    const schoolWide = statements.filter((sql) => !isOwnerScoped(sql));
    expect(schoolWide).toHaveLength(1);
    // The monthly report reads the totals people chose to share, for one month, and nothing from the log itself.
    const [report] = schoolWide;
    expect(report).not.toMatch(/\bprivate_hours_log\b/);
    expect(report).toMatch(/FROM private_hours_shares s\b/);
    expect(report).toMatch(/WHERE s\.school_id = \$1 AND s\.month = \$2::date/);
  });
});
