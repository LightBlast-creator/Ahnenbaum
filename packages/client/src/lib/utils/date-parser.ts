/**
 * Date parser — converts natural text expressions to GenealogyDate.
 *
 * Accepts: ISO dates, DD.MM.YYYY, year-only, ~1985, before/after YYYY,
 * between YYYY and YYYY, etc.
 */

import type { GenealogyDate } from '@ahnenbaum/core';

/**
 * Try to normalize a date part to ISO format (YYYY, YYYY-MM, or YYYY-MM-DD).
 */
function normalizeDate(input: string): string | null {
  const trimmed = input.trim();

  // YYYY-MM-DD (ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;

  // YYYY
  if (/^\d{4}$/.test(trimmed)) return trimmed;

  // DD.MM.YYYY (European)
  const euMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euMatch) {
    const day = euMatch[1].padStart(2, '0');
    const month = euMatch[2].padStart(2, '0');
    const year = euMatch[3];
    return `${year}-${month}-${day}`;
  }

  // MM/DD/YYYY (US)
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = usMatch[1].padStart(2, '0');
    const day = usMatch[2].padStart(2, '0');
    const year = usMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Parse a text input into a GenealogyDate.
 *
 * Returns null if the input cannot be parsed.
 *
 * @example
 * parseDate('1985-03-15')        // { type: 'exact', date: '1985-03-15' }
 * parseDate('15.03.1985')        // { type: 'exact', date: '1985-03-15' }
 * parseDate('1985')              // { type: 'exact', date: '1985' }
 * parseDate('~1985')             // { type: 'approximate', date: '1985' }
 * parseDate('about 1985')        // { type: 'approximate', date: '1985' }
 * parseDate('before 1900')       // { type: 'before', date: '1900' }
 * parseDate('after 1800')        // { type: 'after', date: '1800' }
 * parseDate('between 1980 and 1985')  // { type: 'range', from: '1980', to: '1985' }
 */
export function parseDate(input: string): GenealogyDate | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Approximate: ~1985, circa 1985, about 1985, ungefähr 1985, ca. 1985, ca 1985
  const approxMatch = trimmed.match(/^(?:~|circa\s+|about\s+|ungefähr\s+|ca\.?\s+)(.+)$/i);
  if (approxMatch) {
    const date = normalizeDate(approxMatch[1]);
    if (date) return { type: 'approximate', date };
  }

  // Before: before 1900, vor 1900
  const beforeMatch = trimmed.match(/^(?:before\s+|bef\.?\s+|vor\s+)(.+)$/i);
  if (beforeMatch) {
    const date = normalizeDate(beforeMatch[1]);
    if (date) return { type: 'before', date };
  }

  // After: after 1800, nach 1800
  const afterMatch = trimmed.match(/^(?:after\s+|aft\.?\s+|nach\s+)(.+)$/i);
  if (afterMatch) {
    const date = normalizeDate(afterMatch[1]);
    if (date) return { type: 'after', date };
  }

  // Range: between 1980 and 1985, zwischen 1980 und 1985, 1980-1985 (year range)
  const rangeMatch = trimmed.match(/^(?:between\s+|zwischen\s+)(.+?)\s+(?:and|und)\s+(.+)$/i);
  if (rangeMatch) {
    const from = normalizeDate(rangeMatch[1]);
    const to = normalizeDate(rangeMatch[2]);
    if (from && to) return { type: 'range', from, to };
  }

  // Year range shorthand: 1980-1985 (but not ISO date)
  const yearRangeMatch = trimmed.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
  if (yearRangeMatch) {
    return { type: 'range', from: yearRangeMatch[1], to: yearRangeMatch[2] };
  }

  // Exact: any normalizable date
  const exact = normalizeDate(trimmed);
  if (exact) return { type: 'exact', date: exact };

  return null;
}
