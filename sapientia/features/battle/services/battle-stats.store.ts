import { createPersistentStore } from '@/shared/services/persistent-store';
import type { BattleRecord } from '../interfaces/battle-run.interface';

export type BattleStats = Readonly<Record<string, BattleRecord>>;

/**
 * Keyed by stage, `<chapter id>:<level>` (see stageKey). Records from before chapters, keyed by monster or by the prototype's short
 * ids, no longer match anything and are dropped.
 */
const STAGE_KEY = /^[a-z]+-[0-9]+:[1-4]$/;

const count = (value: unknown): number => (Number.isInteger(value) && (value as number) >= 0 ? (value as number) : 0);

export function parseBattleStats(raw: string | null): BattleStats {
  if (!raw) return {};
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!saved || typeof saved !== 'object') return {};
  const stats: Record<string, BattleRecord> = {};
  for (const [id, entry] of Object.entries(saved as Record<string, unknown>)) {
    if (!STAGE_KEY.test(id) || !entry || typeof entry !== 'object') continue;
    const { attempts, wins } = entry as { attempts?: unknown; wins?: unknown };
    stats[id] = { attempts: count(attempts), wins: count(wins) };
  }
  return stats;
}

export const battleStatsStore = createPersistentStore<BattleStats>({
  key: 'sapientia.battles',
  defaultValue: {},
  parse: parseBattleStats,
  serialize: (stats) => JSON.stringify(stats),
});

export const recordFor = (stats: BattleStats, key: string): BattleRecord => stats[key] ?? { attempts: 0, wins: 0 };

/** Count one finished fight; returns the stage's updated record. */
export function recordBattle(key: string, won: boolean): BattleRecord {
  const current = recordFor(battleStatsStore.getSnapshot(), key);
  const updated = { attempts: current.attempts + 1, wins: current.wins + (won ? 1 : 0) };
  battleStatsStore.set((stats) => ({ ...stats, [key]: updated }));
  return updated;
}
