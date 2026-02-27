/**
 * Shared UI constants used across multiple components.
 */

import * as m from '$lib/paraglide/messages';
import type { Sex } from '@ahnenbaum/core';

/** Sex select options with i18n labels. */
export const sexOptions: { value: Sex; label: () => string }[] = [
  { value: 'unknown', label: () => m.person_sex_unknown() },
  { value: 'male', label: () => m.person_sex_male() },
  { value: 'female', label: () => m.person_sex_female() },
  { value: 'intersex', label: () => m.person_sex_intersex() },
];
