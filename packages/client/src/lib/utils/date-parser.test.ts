import { describe, expect, it } from 'vitest';
import { parseDate } from './date-parser';

describe('parseDate', () => {
  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('   ')).toBeNull();
  });

  it('returns null for unparseable input', () => {
    expect(parseDate('hello')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
  });

  // Exact dates
  it('parses ISO date (YYYY-MM-DD)', () => {
    expect(parseDate('1985-03-15')).toEqual({ type: 'exact', date: '1985-03-15' });
  });

  it('parses ISO month (YYYY-MM)', () => {
    expect(parseDate('1985-03')).toEqual({ type: 'exact', date: '1985-03' });
  });

  it('parses year only', () => {
    expect(parseDate('1985')).toEqual({ type: 'exact', date: '1985' });
  });

  it('parses European date (DD.MM.YYYY)', () => {
    expect(parseDate('15.03.1985')).toEqual({ type: 'exact', date: '1985-03-15' });
  });

  it('parses European date with single digits', () => {
    expect(parseDate('5.3.1985')).toEqual({ type: 'exact', date: '1985-03-05' });
  });

  it('parses US date (MM/DD/YYYY)', () => {
    expect(parseDate('03/15/1985')).toEqual({ type: 'exact', date: '1985-03-15' });
  });

  // Approximate dates
  it('parses ~ prefix', () => {
    expect(parseDate('~1985')).toEqual({ type: 'approximate', date: '1985' });
  });

  it('parses "about" prefix', () => {
    expect(parseDate('about 1985')).toEqual({ type: 'approximate', date: '1985' });
  });

  it('parses "circa" prefix', () => {
    expect(parseDate('circa 1985')).toEqual({ type: 'approximate', date: '1985' });
  });

  it('parses "ca." prefix', () => {
    expect(parseDate('ca. 1985')).toEqual({ type: 'approximate', date: '1985' });
  });

  it('parses "ca" prefix (no dot)', () => {
    expect(parseDate('ca 1985')).toEqual({ type: 'approximate', date: '1985' });
  });

  it('parses "ungefähr" prefix (German)', () => {
    expect(parseDate('ungefähr 1985')).toEqual({ type: 'approximate', date: '1985' });
  });

  it('parses approximate with full date', () => {
    expect(parseDate('~15.03.1985')).toEqual({ type: 'approximate', date: '1985-03-15' });
  });

  // Before dates
  it('parses "before" prefix', () => {
    expect(parseDate('before 1900')).toEqual({ type: 'before', date: '1900' });
  });

  it('parses "bef." prefix', () => {
    expect(parseDate('bef. 1900')).toEqual({ type: 'before', date: '1900' });
  });

  it('parses "vor" prefix (German)', () => {
    expect(parseDate('vor 1900')).toEqual({ type: 'before', date: '1900' });
  });

  // After dates
  it('parses "after" prefix', () => {
    expect(parseDate('after 1800')).toEqual({ type: 'after', date: '1800' });
  });

  it('parses "aft." prefix', () => {
    expect(parseDate('aft. 1800')).toEqual({ type: 'after', date: '1800' });
  });

  it('parses "nach" prefix (German)', () => {
    expect(parseDate('nach 1800')).toEqual({ type: 'after', date: '1800' });
  });

  // Range dates
  it('parses "between X and Y"', () => {
    expect(parseDate('between 1980 and 1985')).toEqual({
      type: 'range',
      from: '1980',
      to: '1985',
    });
  });

  it('parses "zwischen X und Y" (German)', () => {
    expect(parseDate('zwischen 1980 und 1985')).toEqual({
      type: 'range',
      from: '1980',
      to: '1985',
    });
  });

  it('parses year range shorthand (1980-1985)', () => {
    expect(parseDate('1980-1985')).toEqual({
      type: 'range',
      from: '1980',
      to: '1985',
    });
  });

  it('parses year range with en-dash (1980–1985)', () => {
    expect(parseDate('1980–1985')).toEqual({
      type: 'range',
      from: '1980',
      to: '1985',
    });
  });

  // Whitespace handling
  it('trims whitespace', () => {
    expect(parseDate('  1985  ')).toEqual({ type: 'exact', date: '1985' });
  });
});
