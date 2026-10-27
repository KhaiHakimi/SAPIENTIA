import { createPersistentStore } from '@/shared/services/persistent-store';
import type { BattleRecord } from '../interfaces/battle-run.interface';

export type BattleStats = Readonly<Record<string, BattleRecord>>;

/** Records saved by the prototype used short monster ids; they are carried over to the character ids. */
const LEGACY_IDS: Record<string, string> = { bunian: 'orang-bunian', naga: 'naga-laut', harimau: 'harimau-jin', hantu: 'hantu-lelaki' };

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
    if (!entry || typeof entry !== 'object') continue;
    const { attempts, wins } = entry as { attempts?: unknown; wins?: unknown };
    stats[LEGACY_IDS[id] ?? id] = { attempts: count(attempts), wins: count(wins) };
  }
  return stats;
}

export const battleStatsStore = createPersistentStore<BattleStats>({
  key: 'sapientia.battles',
  defaultValue: {},
  parse: parseBattleStats,
  serialize: (stats) => JSON.stringify(stats),
});

export const recordFor = (stats: BattleStats, monsterId: string): BattleRecord => stats[monsterId] ?? { attempts: 0, wins: 0 };

/** Count one finished fight; returns the monster's updated record. */
export function recordBattle(monsterId: string, won: boolean): BattleRecord {
  const current = recordFor(battleStatsStore.getSnapshot(), monsterId);
  const updated = { attempts: current.attempts + 1, wins: current.wins + (won ? 1 : 0) };
  battleStatsStore.set((stats) => ({ ...stats, [monsterId]: updated }));
  return updated;
}
