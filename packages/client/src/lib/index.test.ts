import { describe, expect, it } from 'vitest';
import { APP_NAME } from '@ahnenbaum/core';

describe('client core integration', () => {
  it('can import APP_NAME from @ahnenbaum/core', () => {
    expect(APP_NAME).toBe('Ahnenbaum');
  });
});
