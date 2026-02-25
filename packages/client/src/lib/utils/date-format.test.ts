import { describe, expect, it } from 'vitest';
import { formatDate, formatLifespan, extractYear } from './date-format';
import type { GenealogyDate } from '@ahnenbaum/core';

describe('formatDate', () => {
  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('formats exact date with full precision', () => {
    const d: GenealogyDate = { type: 'exact', date: '1985-03-15' };
    expect(formatDate(d)).toBe('15 Mar 1985');
  });

  it('formats exact date with month only', () => {
    const d: GenealogyDate = { type: 'exact', date: '1985-03' };
    expect(formatDate(d)).toBe('Mar 1985');
  });

  it('formats exact date with year only', () => {
    const d: GenealogyDate = { type: 'exact', date: '1985' };
    expect(formatDate(d)).toBe('1985');
  });

  it('formats approximate date', () => {
    const d: GenealogyDate = { type: 'approximate', date: '1890' };
    expect(formatDate(d)).toBe('~1890');
  });

  it('formats approximate date with full precision', () => {
    const d: GenealogyDate = { type: 'approximate', date: '1890-06-15' };
    expect(formatDate(d)).toBe('~15 Jun 1890');
  });

  it('formats range date', () => {
    const d: GenealogyDate = { type: 'range', from: '1850', to: '1860' };
    expect(formatDate(d)).toBe('1850–1860');
  });

  it('formats range with full precision', () => {
    const d: GenealogyDate = { type: 'range', from: '1980-01-01', to: '1985-12-31' };
    expect(formatDate(d)).toBe('1 Jan 1980–31 Dec 1985');
  });

  it('formats before date', () => {
    const d: GenealogyDate = { type: 'before', date: '1900' };
    expect(formatDate(d)).toBe('bef. 1900');
  });

  it('formats after date', () => {
    const d: GenealogyDate = { type: 'after', date: '1800' };
    expect(formatDate(d)).toBe('aft. 1800');
  });
});

describe('extractYear', () => {
  it('returns empty string for undefined', () => {
    expect(extractYear(undefined)).toBe('');
  });

  it('extracts year from exact date', () => {
    expect(extractYear({ type: 'exact', date: '1985-03-15' })).toBe('1985');
  });

  it('extracts year from range date', () => {
    expect(extractYear({ type: 'range', from: '1980', to: '1990' })).toBe('1980');
  });
});

describe('formatLifespan', () => {
  it('returns empty string when both undefined', () => {
    expect(formatLifespan(undefined, undefined)).toBe('');
  });

  it('formats full lifespan', () => {
    const birth: GenealogyDate = { type: 'exact', date: '1872-03-15' };
    const death: GenealogyDate = { type: 'exact', date: '1945-04-12' };
    expect(formatLifespan(birth, death)).toBe('1872–1945');
  });

  it('formats birth only (still alive)', () => {
    const birth: GenealogyDate = { type: 'exact', date: '1970-08-12' };
    expect(formatLifespan(birth, undefined)).toBe('1970–');
  });

  it('formats death only', () => {
    const death: GenealogyDate = { type: 'exact', date: '1945' };
    expect(formatLifespan(undefined, death)).toBe('–1945');
  });
});
