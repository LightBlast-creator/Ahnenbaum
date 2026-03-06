/**
 * Event type configuration — single source of truth for types, emojis, and colors.
 *
 * Shared between EventList, EventTimeline, and EventForm to avoid duplication.
 */

import * as m from '$lib/paraglide/messages';
import type { EventType } from '@ahnenbaum/core';

/** Emoji icon for each event type. */
export const EVENT_TYPE_EMOJI: Record<EventType, string> = {
  birth: '🎂',
  death: '✝',
  marriage: '💍',
  baptism: '💧',
  burial: '⚰️',
  immigration: '🚢',
  emigration: '✈️',
  occupation: '💼',
  residence: '🏠',
  military_service: '🎖️',
  education: '🎓',
  census: '📋',
  custom: '📝',
};

/** CSS color value for each event type (references design tokens where possible). */
export const EVENT_TYPE_COLOR: Record<EventType, string> = {
  birth: 'var(--color-success)',
  baptism: 'var(--color-success)',
  death: 'var(--color-danger)',
  burial: 'var(--color-danger)',
  marriage: '#ec4899',
  immigration: 'var(--color-primary)',
  emigration: 'var(--color-primary)',
  residence: 'var(--color-primary)',
  occupation: 'var(--color-warning)',
  education: 'var(--color-warning)',
  military_service: 'var(--color-warning)',
  census: 'var(--color-text-muted)',
  custom: 'var(--color-text-muted)',
};

/** i18n label getter for each event type. */
export const EVENT_TYPE_NAMES: Record<EventType, () => string> = {
  birth: () => m.event_type_birth(),
  death: () => m.event_type_death(),
  marriage: () => m.event_type_marriage(),
  baptism: () => m.event_type_baptism(),
  burial: () => m.event_type_burial(),
  immigration: () => m.event_type_immigration(),
  emigration: () => m.event_type_emigration(),
  occupation: () => m.event_type_occupation(),
  residence: () => m.event_type_residence(),
  military_service: () => m.event_type_military_service(),
  education: () => m.event_type_education(),
  census: () => m.event_type_census(),
  custom: () => m.event_type_custom(),
};

/** All event types for dropdowns. */
export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'birth', label: `${EVENT_TYPE_EMOJI.birth} Birth` },
  { value: 'death', label: `${EVENT_TYPE_EMOJI.death} Death` },
  { value: 'marriage', label: `${EVENT_TYPE_EMOJI.marriage} Marriage` },
  { value: 'baptism', label: `${EVENT_TYPE_EMOJI.baptism} Baptism` },
  { value: 'burial', label: `${EVENT_TYPE_EMOJI.burial} Burial` },
  { value: 'immigration', label: `${EVENT_TYPE_EMOJI.immigration} Immigration` },
  { value: 'emigration', label: `${EVENT_TYPE_EMOJI.emigration} Emigration` },
  { value: 'occupation', label: `${EVENT_TYPE_EMOJI.occupation} Occupation` },
  { value: 'residence', label: `${EVENT_TYPE_EMOJI.residence} Residence` },
  { value: 'military_service', label: `${EVENT_TYPE_EMOJI.military_service} Military` },
  { value: 'education', label: `${EVENT_TYPE_EMOJI.education} Education` },
  { value: 'census', label: `${EVENT_TYPE_EMOJI.census} Census` },
  { value: 'custom', label: `${EVENT_TYPE_EMOJI.custom} Custom` },
];
