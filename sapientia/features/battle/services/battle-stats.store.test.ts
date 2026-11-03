import { describe, expect, it } from 'vitest';
import { parseBattleStats, recordFor } from './battle-stats.store';

describe('saved battle records', () => {
  it('reads records per chapter and level, and drops the old per-monster ones', () => {
    const stats = parseBattleStats(JSON.stringify({ 'math-1:1': { attempts: 3, wins: 1 }, 'bm-2:4': { attempts: 1, wins: 0 }, bunian: { attempts: 2, wins: 2 }, 'naga-laut': { attempts: 1, wins: 1 } }));
    expect(stats).toEqual({ 'math-1:1': { attempts: 3, wins: 1 }, 'bm-2:4': { attempts: 1, wins: 0 } });
  });

  it('treats edited or broken data as zero', () => {
    expect(parseBattleStats('not json')).toEqual({});
    expect(parseBattleStats(JSON.stringify({ 'sci-1:3': { attempts: -2, wins: 'lots' } }))['sci-1:3']).toEqual({ attempts: 0, wins: 0 });
    expect(recordFor({}, 'sci-1:3')).toEqual({ attempts: 0, wins: 0 });
  });
});
