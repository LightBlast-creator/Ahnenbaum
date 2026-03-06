import { describe, it, expect } from 'vitest';
import { sortEventsChronologically } from './event-sort';
import type { Event, EventType, GenealogyDate } from '@ahnenbaum/core';

/** Helper to create a minimal event for testing. */
function makeEvent(type: EventType, date?: GenealogyDate, id?: string): Event {
  return {
    id: id ?? crypto.randomUUID(),
    type,
    date,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

describe('sortEventsChronologically', () => {
  it('sorts events by date ascending', () => {
    const events = [
      makeEvent('occupation', { type: 'exact', date: '1920' }),
      makeEvent('birth', { type: 'exact', date: '1900' }),
      makeEvent('death', { type: 'exact', date: '1970' }),
    ];

    const sorted = sortEventsChronologically(events);
    expect(sorted.map((e) => e.type)).toEqual(['birth', 'occupation', 'death']);
  });

  it('puts birth before death when dates are equal', () => {
    const events = [
      makeEvent('death', { type: 'exact', date: '1900' }),
      makeEvent('birth', { type: 'exact', date: '1900' }),
    ];

    const sorted = sortEventsChronologically(events);
    expect(sorted.map((e) => e.type)).toEqual(['birth', 'death']);
  });

  it('puts baptism right after birth for same date', () => {
    const events = [
      makeEvent('baptism', { type: 'exact', date: '1900' }),
      makeEvent('death', { type: 'exact', date: '1900' }),
      makeEvent('birth', { type: 'exact', date: '1900' }),
    ];

    const sorted = sortEventsChronologically(events);
    expect(sorted.map((e) => e.type)).toEqual(['birth', 'baptism', 'death']);
  });

  it('puts burial after death for same date', () => {
    const events = [
      makeEvent('burial', { type: 'exact', date: '1970' }),
      makeEvent('death', { type: 'exact', date: '1970' }),
    ];

    const sorted = sortEventsChronologically(events);
    expect(sorted.map((e) => e.type)).toEqual(['death', 'burial']);
  });

  it('groups dateless events at the end', () => {
    const events = [
      makeEvent('custom'),
      makeEvent('birth', { type: 'exact', date: '1900' }),
      makeEvent('occupation'),
    ];

    const sorted = sortEventsChronologically(events);
    expect(sorted[0].type).toBe('birth');
    // Dateless events at the end
    expect(sorted[1].date).toBeUndefined();
    expect(sorted[2].date).toBeUndefined();
  });

  it('sorts dateless events by type priority', () => {
    const events = [makeEvent('death'), makeEvent('birth'), makeEvent('occupation')];

    const sorted = sortEventsChronologically(events);
    expect(sorted.map((e) => e.type)).toEqual(['birth', 'occupation', 'death']);
  });

  it('handles approximate dates', () => {
    const events = [
      makeEvent('occupation', { type: 'approximate', date: '1920' }),
      makeEvent('birth', { type: 'exact', date: '1900' }),
    ];

    const sorted = sortEventsChronologically(events);
    expect(sorted.map((e) => e.type)).toEqual(['birth', 'occupation']);
  });

  it('handles range dates (uses from year)', () => {
    const events = [
      makeEvent('residence', { type: 'range', from: '1920', to: '1930' }),
      makeEvent('birth', { type: 'exact', date: '1900' }),
    ];

    const sorted = sortEventsChronologically(events);
    expect(sorted.map((e) => e.type)).toEqual(['birth', 'residence']);
  });

  it('returns a new array (no mutation)', () => {
    const events = [
      makeEvent('death', { type: 'exact', date: '1970' }),
      makeEvent('birth', { type: 'exact', date: '1900' }),
    ];

    const sorted = sortEventsChronologically(events);
    expect(sorted).not.toBe(events);
    // Original is unchanged
    expect(events[0].type).toBe('death');
  });

  it('handles empty array', () => {
    expect(sortEventsChronologically([])).toEqual([]);
  });

  it('handles single event', () => {
    const events = [makeEvent('birth', { type: 'exact', date: '1900' })];
    const sorted = sortEventsChronologically(events);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].type).toBe('birth');
  });
});
