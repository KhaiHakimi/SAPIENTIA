import { describe, expect, it } from 'vitest';
import { MONSTERS } from '@/features/characters';
import { VILLAIN_LINES } from './villain-lines';

describe('villain lines', () => {
  it('give every monster a voice in both languages', () => {
    for (const monster of MONSTERS) {
      const lines = VILLAIN_LINES[monster.id];
      expect(lines, monster.id).toBeDefined();
      const all = [lines!.entrance, lines!.defeat, lines!.victory, ...lines!.taunts, ...lines!.pain];
      expect(lines!.taunts.length * lines!.pain.length, monster.id).toBeGreaterThan(0);
      for (const line of all) expect(line.ms && line.en, monster.id).toBeTruthy();
    }
  });
});
