import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { uploadRoot } from './file-storage.service';

describe('uploadRoot', () => {
  it('defaults to .data/uploads, outside the web root', () => {
    expect(uploadRoot({})).toBe(resolve('.data/uploads'));
  });

  it('refuses a folder inside public/, where Next.js would serve the files to anyone', () => {
    expect(() => uploadRoot({ UPLOAD_DIR: 'public' })).toThrow(/public/);
    expect(() => uploadRoot({ UPLOAD_DIR: 'public/uploads' })).toThrow(/public/);
    expect(() => uploadRoot({ UPLOAD_DIR: resolve('public', 'x') })).toThrow(/public/);
  });

  it('accepts folders elsewhere, including one whose name only starts like public', () => {
    expect(uploadRoot({ UPLOAD_DIR: 'public-uploads' })).toBe(resolve('public-uploads'));
    expect(uploadRoot({ UPLOAD_DIR: resolve('..', 'sapientia-files') })).toBe(resolve('..', 'sapientia-files'));
  });
});
