/**
 * Date formatting utilities for GenealogyDate display.
 */

import type { GenealogyDate } from '@ahnenbaum/core';

/**
 * Format an ISO date string component to a readable format.
 * Handles YYYY, YYYY-MM, and YYYY-MM-DD.
 */
function formatIsoDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length === 1) return parts[0]; // Year only

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const year = parts[0];
  const month = months[parseInt(parts[1], 10) - 1];

  if (parts.length === 2) return `${month} ${year}`;

  const day = parseInt(parts[2], 10);
  return `${day} ${month} ${year}`;
}

/**
 * Format a GenealogyDate to a human-readable string.
 *
 * - exact:       "15 Mar 1985"
 * - approximate: "~1985"
 * - range:       "1980–1985"
 * - before:      "bef. 1900"
 * - after:       "aft. 1800"
 */
export function formatDate(date: GenealogyDate | undefined): string {
  if (!date) return '';

  switch (date.type) {
    case 'exact':
      return formatIsoDate(date.date);
    case 'approximate':
      return `~${formatIsoDate(date.date)}`;
    case 'range':
      return `${formatIsoDate(date.from)}–${formatIsoDate(date.to)}`;
    case 'before':
      return `bef. ${formatIsoDate(date.date)}`;
    case 'after':
      return `aft. ${formatIsoDate(date.date)}`;
    default:
      return '';
  }
}

/**
 * Extract just the year from a GenealogyDate for concise display.
 */
export function extractYear(date: GenealogyDate | undefined): string {
  if (!date) return '';

  switch (date.type) {
    case 'exact':
    case 'approximate':
    case 'before':
    case 'after':
      return date.date.split('-')[0];
    case 'range':
      return date.from.split('-')[0];
    default:
      return '';
  }
}

/**
 * Format a lifespan string: "1872–1945", "1872–", "–1945", or "".
 */
export function formatLifespan(birthDate?: GenealogyDate, deathDate?: GenealogyDate): string {
  const birth = extractYear(birthDate);
  const death = extractYear(deathDate);

  if (!birth && !death) return '';
  if (birth && death) return `${birth}–${death}`;
  if (birth) return `${birth}–`;
  return `–${death}`;
}

/**
 * Calculate age from birth and optional death dates.
 * Returns a string like "(78 years)" or "(32 years)" or "".
 */
export function calculateAge(birthDate?: GenealogyDate, deathDate?: GenealogyDate): string {
  const birthYear = parseInt(extractYear(birthDate), 10);
  if (!birthYear || isNaN(birthYear)) return '';

  const deathYear = parseInt(extractYear(deathDate), 10);
  const referenceYear = !isNaN(deathYear) && deathYear > 0 ? deathYear : new Date().getFullYear();

  const age = referenceYear - birthYear;
  if (age < 0 || age > 150) return '';
  return `(${age})`;
}
