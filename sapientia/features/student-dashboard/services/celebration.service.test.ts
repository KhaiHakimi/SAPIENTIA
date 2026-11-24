import { describe, expect, it } from 'vitest';
import { SAMPLE_RELICS } from '../data/sample-relics';
import { createCelebrationLog } from './celebration.service';

const [relicA, relicB] = SAMPLE_RELICS;

describe('celebrations on one visit', () => {
  it('celebrates a level once, even when unticking and re-ticking crosses it again', () => {
    const log = createCelebrationLog();
    expect(log.levelUp(3, 4)).toBe(4);
    // Unticked (back to 3), then ticked again.
    expect(log.levelUp(3, 4)).toBeNull();
    expect(log.levelUp(4, 5)).toBe(5);
    expect(log.levelUp(3, 5)).toBeNull();
  });

  it('never celebrates staying on the same level', () => {
    expect(createCelebrationLog().levelUp(3, 3)).toBeNull();
  });

  it('shows each relic once', () => {
    const log = createCelebrationLog();
    expect(log.freshRelics([relicA])).toEqual([relicA]);
    expect(log.freshRelics([relicA, relicB])).toEqual([relicB]);
    expect(log.freshRelics([relicA, relicB])).toEqual([]);
  });

  it('bursts coins only the first time a quest is ticked', () => {
    const log = createCelebrationLog();
    expect(log.firstTick('math')).toBe(true);
    expect(log.firstTick('math')).toBe(false);
    expect(log.firstTick('sci')).toBe(true);
  });
});
