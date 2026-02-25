import { describe, expect, it } from 'vitest';
import { APP_NAME, APP_VERSION } from './index';

describe('core exports', () => {
  it('exports the correct app name', () => {
    expect(APP_NAME).toBe('Ahnenbaum');
  });

  it('exports a version string', () => {
    expect(APP_VERSION).toBeDefined();
    expect(typeof APP_VERSION).toBe('string');
  });
});
