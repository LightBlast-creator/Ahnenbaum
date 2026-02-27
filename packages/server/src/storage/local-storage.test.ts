/**
 * LocalStorageAdapter unit tests.
 *
 * Tests file operations using a real temporary directory.
 */

import { describe, expect, it, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { LocalStorageAdapter, createLocalStorage } from './local-storage';

function tempDir(): string {
  const dir = join(tmpdir(), `ahnenbaum-test-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('LocalStorageAdapter', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // best effort
      }
    }
    dirs.length = 0;
  });

  function createAdapter(): { adapter: LocalStorageAdapter; basePath: string } {
    const basePath = tempDir();
    dirs.push(basePath);
    return { adapter: new LocalStorageAdapter(basePath), basePath };
  }

  it('save + get roundtrip', async () => {
    const { adapter } = createAdapter();
    const data = Buffer.from('hello world');

    await adapter.save('media-1', 'photo.jpg', data);
    const result = await adapter.get('media-1', 'photo.jpg');

    expect(result).not.toBeNull();
    if (!result) throw new Error('Expected result');
    expect(result.toString()).toBe('hello world');
  });

  it('get returns null for missing file', async () => {
    const { adapter } = createAdapter();
    const result = await adapter.get('nonexistent', 'missing.jpg');
    expect(result).toBeNull();
  });

  it('delete removes the media directory', async () => {
    const { adapter, basePath } = createAdapter();
    await adapter.save('media-2', 'file.pdf', Buffer.from('content'));

    expect(existsSync(join(basePath, 'media-2'))).toBe(true);

    await adapter.delete('media-2');
    expect(existsSync(join(basePath, 'media-2'))).toBe(false);
  });

  it('delete on nonexistent directory does not throw', async () => {
    const { adapter } = createAdapter();
    await expect(adapter.delete('nothing')).resolves.toBeUndefined();
  });

  it('exists returns true for saved file', async () => {
    const { adapter } = createAdapter();
    await adapter.save('media-3', 'doc.txt', Buffer.from('data'));
    expect(await adapter.exists('media-3', 'doc.txt')).toBe(true);
  });

  it('exists returns false for missing file', async () => {
    const { adapter } = createAdapter();
    expect(await adapter.exists('media-3', 'nope.txt')).toBe(false);
  });

  it('getPath constructs correct path', () => {
    const { adapter, basePath } = createAdapter();
    const path = adapter.getPath('id-123', 'photo.jpg');
    expect(path).toBe(join(basePath, 'id-123', 'photo.jpg'));
  });

  it('sanitizes path traversal attempts in filenames', async () => {
    const { adapter, basePath } = createAdapter();
    await adapter.save('media-4', '../../etc/passwd', Buffer.from('evil'));

    // Should save as just "passwd" (basename stripped)
    expect(existsSync(join(basePath, 'media-4', 'passwd'))).toBe(true);
    // Should NOT have created anything outside the media dir
    expect(existsSync(join(basePath, '..', 'etc'))).toBe(false);
  });

  it('sanitizes control characters in filenames', async () => {
    const { adapter } = createAdapter();
    await adapter.save('media-5', 'file\x00name.txt', Buffer.from('data'));

    const result = await adapter.get('media-5', 'file\x00name.txt');
    expect(result).not.toBeNull();
  });

  it('handles empty filename gracefully', () => {
    const { adapter, basePath } = createAdapter();
    // getPath with empty filename should fall back to 'unnamed'
    const path = adapter.getPath('id', '');
    expect(path).toBe(join(basePath, 'id', 'unnamed'));
  });
});

describe('createLocalStorage', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // best effort
      }
    }
    dirs.length = 0;
  });

  it('creates the base directory if it does not exist', () => {
    const dir = join(tmpdir(), `ahnenbaum-create-${randomBytes(4).toString('hex')}`);
    dirs.push(dir);

    expect(existsSync(dir)).toBe(false);
    const adapter = createLocalStorage(dir);
    expect(existsSync(dir)).toBe(true);
    expect(adapter).toBeInstanceOf(LocalStorageAdapter);
  });
});
