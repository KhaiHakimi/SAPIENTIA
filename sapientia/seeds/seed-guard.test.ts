import { describe, expect, it } from 'vitest';
import { devSeedRefusal } from './seed-guard';

describe('development seed guard', () => {
  it('refuses to run where NODE_ENV is production', () => {
    expect(devSeedRefusal({ NODE_ENV: 'production' }, [])).toMatch(/NODE_ENV is production.*--force-dev/);
  });

  it('runs in development, or in production only with --force-dev', () => {
    expect(devSeedRefusal({ NODE_ENV: 'development' }, [])).toBeNull();
    expect(devSeedRefusal({ NODE_ENV: 'production' }, ['--force-dev'])).toBeNull();
  });
});
