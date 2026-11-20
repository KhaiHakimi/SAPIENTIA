import { describe, expect, it } from 'vitest';
import { ORIGINAL_OUTFIT } from '../data/outfit-colours';
import { isOriginalOutfit, parseOutfit } from './pahlawan-outfit.store';

describe('saved outfit', () => {
  it('reads known colours', () => {
    expect(parseOutfit(JSON.stringify({ clothes: 'blue', sampin: 'white' }))).toEqual({ clothes: 'blue', sampin: 'white' });
  });

  it('falls back to the drawn colours for anything unknown or broken', () => {
    expect(parseOutfit(JSON.stringify({ clothes: 'gold', sampin: 'green' }))).toEqual({ clothes: 'black', sampin: 'green' });
    expect(parseOutfit('not json')).toEqual(ORIGINAL_OUTFIT);
    expect(parseOutfit(null)).toEqual(ORIGINAL_OUTFIT);
  });

  it('knows the drawn colours', () => {
    expect(isOriginalOutfit({ clothes: 'black', sampin: 'red' })).toBe(true);
    expect(isOriginalOutfit({ clothes: 'black', sampin: 'blue' })).toBe(false);
  });
});
