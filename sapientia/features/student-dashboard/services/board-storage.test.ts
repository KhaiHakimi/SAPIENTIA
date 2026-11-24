import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { battleStatsStores } from '@/features/battle/services/battle-stats.store';
import { pahlawanNameStores } from '@/features/pahlawan/services/pahlawan-name.service';
import { pahlawanOutfitStores } from '@/features/pahlawan/services/pahlawan-outfit.store';
import { shopStores } from '@/features/shop/services/shop.store';
import { removeLegacyPupilKeys } from '@/shared/services/pupil-store';
import { profilePhotoStores } from './profile-photo.service';

const LEGACY_KEYS = ['sapientia.photo', 'sapientia.shop', 'sapientia.battles', 'sapientia.knight', 'sapientia.pahlawan.outfit'];

let items: Map<string, string>;

beforeEach(() => {
  items = new Map();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
      removeItem: (key: string) => items.delete(key),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('what the board saves in this browser', () => {
  it('keeps every pupil-owned value under a key with the pupil id', () => {
    profilePhotoStores.forPupil('pupil-a').set('data:image/jpeg;base64,AAAA');
    battleStatsStores.forPupil('pupil-a').set({ 'math-1:1': { attempts: 1, wins: 1 } });
    pahlawanNameStores.forPupil('pupil-a').set('Hang');
    shopStores.forPupil('pupil-a').set((state) => state);
    pahlawanOutfitStores.forPupil('pupil-a').set((outfit) => outfit);
    expect([...items.keys()].sort()).toEqual(LEGACY_KEYS.map((key) => `${key}:pupil-a`).sort());

    expect(profilePhotoStores.forPupil('pupil-b').getSnapshot()).toBeNull();
    expect(battleStatsStores.forPupil('pupil-b').getSnapshot()).toEqual({});
    expect(pahlawanNameStores.forPupil('pupil-b').getSnapshot()).toBe('');
  });

  it('removes the old unscoped keys, whose owner is unknown', () => {
    for (const key of LEGACY_KEYS) items.set(key, '{}');
    items.set('sapientia.theme', 'dark');
    removeLegacyPupilKeys();
    expect([...items.keys()]).toEqual(['sapientia.theme']);
  });
});
