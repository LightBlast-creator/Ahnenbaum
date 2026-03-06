/**
 * Event chronological sorting.
 *
 * Sorts events by date (ascending), with type-priority as tiebreaker
 * (birth always first, death always last within the same date).
 * Events without dates are grouped at the end.
 */

import type { Event } from '@ahnenbaum/core';
import { extractYear } from './date-format';

/**
 * Priority map for event types when dates are equal.
 * Lower number = earlier in the list.
 * Birth/baptism at the top, death/burial at the bottom.
 */
export const EVENT_TYPE_PRIORITY: Record<string, number> = {
  birth: 0,
  baptism: 1,
  marriage: 5,
  immigration: 5,
  emigration: 5,
  residence: 5,
  occupation: 5,
  education: 5,
  military_service: 5,
  census: 5,
  custom: 5,
  death: 9,
  burial: 10,
};

/**
 * Get a numeric sort key from a GenealogyDate for chronological ordering.
 * Returns NaN for events without dates.
 */
function getDateSortKey(event: Event): number {
  if (!event.date) return NaN;

  const year = extractYear(event.date);
  return year ? parseInt(year, 10) : NaN;
}

/**
 * Sort events chronologically:
 *  1. Events with dates — ascending by year
 *  2. Within same year — by type priority (birth first, death last)
 *  3. Events without dates — grouped at end, sorted by type priority
 */
export function sortEventsChronologically<T extends Event>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const yearA = getDateSortKey(a);
    const yearB = getDateSortKey(b);

    const hasA = !isNaN(yearA);
    const hasB = !isNaN(yearB);

    // Events without dates go to the end
    if (!hasA && !hasB) {
      return (EVENT_TYPE_PRIORITY[a.type] ?? 5) - (EVENT_TYPE_PRIORITY[b.type] ?? 5);
    }
    if (!hasA) return 1;
    if (!hasB) return -1;

    // Sort by year ascending
    if (yearA !== yearB) return yearA - yearB;

    // Same year — sort by type priority
    return (EVENT_TYPE_PRIORITY[a.type] ?? 5) - (EVENT_TYPE_PRIORITY[b.type] ?? 5);
  });
}
