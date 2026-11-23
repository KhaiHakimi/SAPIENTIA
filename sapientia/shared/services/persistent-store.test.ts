import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPersistentStore } from './persistent-store';

let items: Map<string, string>;
let full: boolean;
let browser: EventTarget;

/** Another tab's write: the shared storage changes and this tab only hears a `storage` event. */
function otherTabWrites(key: string, value: string) {
  items.set(key, value);
  browser.dispatchEvent(Object.assign(new Event('storage'), { key }));
}

const newStore = () =>
  createPersistentStore<string[]>({
    key: 'test.items',
    defaultValue: [],
    parse: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
    serialize: (list) => JSON.stringify(list),
  });

beforeEach(() => {
  items = new Map();
  full = false;
  // The unit tests run in Node, which has no window; this stands in for its storage and events.
  browser = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (full) throw new Error('QuotaExceededError');
        items.set(key, value);
      },
      removeItem: (key: string) => items.delete(key),
    },
  });
  vi.stubGlobal('window', browser);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('persistent store', () => {
  it('picks up what another tab saved, so its own next write keeps it', () => {
    const store = newStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set(['royal']);

    otherTabWrites('test.items', JSON.stringify(['royal', 'owl']));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toEqual(['royal', 'owl']);

    store.set((list) => [...list, 'iron']);
    expect(items.get('test.items')).toBe(JSON.stringify(['royal', 'owl', 'iron']));
    unsubscribe();
  });

  it('ignores other keys and stops listening once nobody is subscribed', () => {
    const store = newStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    otherTabWrites('test.other', '[]');
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
    otherTabWrites('test.items', JSON.stringify(['owl']));
    expect(listener).not.toHaveBeenCalled();
  });

  it('says whether the browser kept the value', () => {
    const store = newStore();
    expect(store.set(['royal'])).toBe(true);
    full = true;
    expect(store.set(['royal', 'owl'])).toBe(false);
    // Still shown for this visit, but nothing new was saved.
    expect(store.getSnapshot()).toEqual(['royal', 'owl']);
    expect(items.get('test.items')).toBe(JSON.stringify(['royal']));
  });
});
