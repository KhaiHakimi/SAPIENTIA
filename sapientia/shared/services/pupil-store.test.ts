import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPupilStoreFamily, pupilStorageKey, removeLegacyPupilKeys } from './pupil-store';

/** A localStorage stand-in; the unit tests run in Node, which has no window. */
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

const family = createPupilStoreFamily<string>({
  key: 'test.photo',
  defaultValue: '',
  parse: (raw) => raw ?? '',
  serialize: (value) => value,
});

let storage: Storage;

beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('per-pupil stores', () => {
  it('keeps each pupil to their own key', () => {
    family.forPupil('pupil-a').set('photo of A');
    expect(storage.getItem(pupilStorageKey('test.photo', 'pupil-a'))).toBe('photo of A');
    expect(storage.getItem('test.photo')).toBeNull();
  });

  it('never shows one pupil what another saved', () => {
    family.forPupil('pupil-c').set('photo of C');
    expect(family.forPupil('pupil-d').getSnapshot()).toBe('');
    family.forPupil('pupil-d').set('photo of D');
    expect(family.forPupil('pupil-c').getSnapshot()).toBe('photo of C');
    family.forPupil('pupil-d').clear();
    expect(family.forPupil('pupil-c').getSnapshot()).toBe('photo of C');
  });

  it('gives the same store object for the same pupil, as useSyncExternalStore needs', () => {
    expect(family.forPupil('pupil-e')).toBe(family.forPupil('pupil-e'));
    expect(family.forPupil('pupil-e')).not.toBe(family.forPupil('pupil-f'));
  });

  it('removes data left under the old unscoped key without handing it to anyone', () => {
    storage.setItem('test.photo', 'photo of an unknown pupil');
    storage.setItem('sapientia.lang', 'en');
    removeLegacyPupilKeys();
    expect(storage.getItem('test.photo')).toBeNull();
    expect(family.forPupil('pupil-g').getSnapshot()).toBe('');
    // Language and theme belong to the device, not the pupil.
    expect(storage.getItem('sapientia.lang')).toBe('en');
  });
});
