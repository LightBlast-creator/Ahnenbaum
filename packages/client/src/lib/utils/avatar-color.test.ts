import { describe, it, expect } from 'vitest';
import { avatarGradient } from './avatar-color';

describe('avatarGradient', () => {
  it('returns a CSS linear-gradient string', () => {
    const result = avatarGradient('John Doe');
    expect(result).toMatch(
      /^linear-gradient\(135deg, hsl\(\d+, 55%, 50%\), hsl\(\d+, 55%, 40%\)\)$/,
    );
  });

  it('is deterministic — same name always produces the same gradient', () => {
    const a = avatarGradient('Maria Schmidt');
    const b = avatarGradient('Maria Schmidt');
    expect(a).toBe(b);
  });

  it('produces different gradients for different names', () => {
    const a = avatarGradient('Anna Müller');
    const b = avatarGradient('Hans Weber');
    expect(a).not.toBe(b);
  });

  it('handles empty string without throwing', () => {
    const result = avatarGradient('');
    expect(result).toMatch(/^linear-gradient/);
  });

  it('handles single character names', () => {
    const result = avatarGradient('A');
    expect(result).toMatch(/^linear-gradient/);
  });

  it('hue values stay within 0-359 range', () => {
    const names = ['Test', 'A very long name with many characters', '日本語', '🌳'];
    for (const name of names) {
      const result = avatarGradient(name);
      const hues = result.match(/hsl\((\d+),/g) ?? [];
      expect(hues.length).toBe(2);
      for (const hue of hues) {
        const match = hue.match(/\d+/);
        const value = parseInt(match?.[0] ?? '0');
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(360);
      }
    }
  });
});
