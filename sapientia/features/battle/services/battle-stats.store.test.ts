import { describe, expect, it } from 'vitest';
import { parseBattleStats, recordFor } from './battle-stats.store';

describe('saved battle records', () => {
  it('reads valid records and carries over the prototype ids', () => {
    const stats = parseBattleStats(JSON.stringify({ bunian: { attempts: 3, wins: 1 }, 'naga-laut': { attempts: 1, wins: 0 } }));
    expect(stats['orang-bunian']).toEqual({ attempts: 3, wins: 1 });
    expect(stats['naga-laut']).toEqual({ attempts: 1, wins: 0 });
  });

  it('treats edited or broken data as zero', () => {
    expect(parseBattleStats('not json')).toEqual({});
    expect(parseBattleStats(JSON.stringify({ 'hantu-lelaki': { attempts: -2, wins: 'lots' } }))['hantu-lelaki']).toEqual({ attempts: 0, wins: 0 });
    expect(recordFor({}, 'harimau-jin')).toEqual({ attempts: 0, wins: 0 });
  });
});
