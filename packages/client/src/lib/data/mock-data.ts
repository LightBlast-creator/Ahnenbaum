/**
 * Mock data layer — single source of truth until Phase 2 API is ready.
 *
 * Contains: persons, names, events, relationships, places.
 * Exports accessor functions with the same signatures the real API will use.
 *
 * To swap for real API: replace function bodies with fetch() calls.
 */

import type {
  Person,
  PersonName,
  Event,
  Relationship,
  Place,
  GenealogyDate,
  Sex,
} from '@ahnenbaum/core';

// ── Places ──

const places: Place[] = [
  {
    id: 'pl-1',
    name: 'München',
    parentId: 'pl-2',
    latitude: 48.1351,
    longitude: 11.582,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'pl-2',
    name: 'Bayern',
    parentId: 'pl-3',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  { id: 'pl-3', name: 'Deutschland', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  {
    id: 'pl-4',
    name: 'Hamburg',
    parentId: 'pl-3',
    latitude: 53.5511,
    longitude: 9.9937,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'pl-5',
    name: 'Berlin',
    parentId: 'pl-3',
    latitude: 52.52,
    longitude: 13.405,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'pl-6',
    name: 'Nürnberg',
    parentId: 'pl-2',
    latitude: 49.4521,
    longitude: 11.0767,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
];

// ── Persons (4 generations) ──

const persons: Person[] = [
  // Gen 1 — Great-grandparents
  { id: 'p-1', sex: 'male', privacy: 'public', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p-2', sex: 'female', privacy: 'public', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p-3', sex: 'male', privacy: 'public', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p-4', sex: 'female', privacy: 'public', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p-5', sex: 'male', privacy: 'public', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p-6', sex: 'female', privacy: 'public', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p-7', sex: 'male', privacy: 'public', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p-8', sex: 'female', privacy: 'public', createdAt: '2025-01-01', updatedAt: '2025-01-01' },

  // Gen 2 — Grandparents
  { id: 'p-9', sex: 'male', privacy: 'public', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  {
    id: 'p-10',
    sex: 'female',
    privacy: 'public',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  { id: 'p-11', sex: 'male', privacy: 'public', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  {
    id: 'p-12',
    sex: 'female',
    privacy: 'public',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Gen 3 — Parents
  {
    id: 'p-13',
    sex: 'male',
    notes: 'Familienoberhaupt',
    privacy: 'public',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'p-14',
    sex: 'female',
    privacy: 'public',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Gen 4 — Root person
  {
    id: 'p-15',
    sex: 'male',
    notes: 'Der Stammhalter',
    privacy: 'public',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
];

// ── Names ──

const personNames: PersonName[] = [
  // Great-grandparents
  {
    id: 'n-1',
    personId: 'p-1',
    given: 'Friedrich',
    surname: 'Müller',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-2',
    personId: 'p-2',
    given: 'Wilhelmine',
    surname: 'Bauer',
    maiden: 'Bauer',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-2b',
    personId: 'p-2',
    given: 'Wilhelmine',
    surname: 'Müller',
    type: 'married',
    isPreferred: false,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-3',
    personId: 'p-3',
    given: 'Karl',
    surname: 'Schmidt',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-4',
    personId: 'p-4',
    given: 'Anna',
    surname: 'Weber',
    maiden: 'Weber',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-5',
    personId: 'p-5',
    given: 'Heinrich',
    surname: 'Fischer',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-6',
    personId: 'p-6',
    given: 'Margarethe',
    surname: 'Hoffmann',
    maiden: 'Hoffmann',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-7',
    personId: 'p-7',
    given: 'Wilhelm',
    surname: 'Wagner',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-8',
    personId: 'p-8',
    given: 'Elisabeth',
    surname: 'Becker',
    maiden: 'Becker',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Grandparents
  {
    id: 'n-9',
    personId: 'p-9',
    given: 'Hans',
    surname: 'Müller',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-10',
    personId: 'p-10',
    given: 'Maria',
    surname: 'Schmidt',
    maiden: 'Schmidt',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-11',
    personId: 'p-11',
    given: 'Werner',
    surname: 'Fischer',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-12',
    personId: 'p-12',
    given: 'Helga',
    surname: 'Wagner',
    maiden: 'Wagner',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Parents
  {
    id: 'n-13',
    personId: 'p-13',
    given: 'Klaus',
    surname: 'Müller',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-14',
    personId: 'p-14',
    given: 'Ingrid',
    surname: 'Fischer',
    maiden: 'Fischer',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'n-14b',
    personId: 'p-14',
    given: 'Ingrid',
    surname: 'Müller',
    type: 'married',
    isPreferred: false,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Root person
  {
    id: 'n-15',
    personId: 'p-15',
    given: 'Maximilian',
    surname: 'Müller',
    nickname: 'Max',
    type: 'birth',
    isPreferred: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
];

// ── Events ──

const d = (date: string): GenealogyDate => ({ type: 'exact', date });
const approx = (date: string): GenealogyDate => ({ type: 'approximate', date });

const events: Event[] = [
  // Great-grandparents
  {
    id: 'e-1',
    type: 'birth',
    personId: 'p-1',
    date: approx('1870'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-2',
    type: 'death',
    personId: 'p-1',
    date: d('1945-04-12'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-3',
    type: 'birth',
    personId: 'p-2',
    date: d('1875-06-22'),
    placeId: 'pl-6',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-4',
    type: 'death',
    personId: 'p-2',
    date: d('1952-11-03'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-5',
    type: 'birth',
    personId: 'p-3',
    date: d('1868-03-14'),
    placeId: 'pl-4',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-6',
    type: 'death',
    personId: 'p-3',
    date: d('1940-08-19'),
    placeId: 'pl-4',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-7',
    type: 'birth',
    personId: 'p-4',
    date: d('1872-12-01'),
    placeId: 'pl-4',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-8',
    type: 'birth',
    personId: 'p-5',
    date: d('1873-07-08'),
    placeId: 'pl-5',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-9',
    type: 'death',
    personId: 'p-5',
    date: d('1944-02-15'),
    placeId: 'pl-5',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-10',
    type: 'birth',
    personId: 'p-6',
    date: d('1878-09-20'),
    placeId: 'pl-5',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-11',
    type: 'birth',
    personId: 'p-7',
    date: approx('1871'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-12',
    type: 'birth',
    personId: 'p-8',
    date: d('1876-04-30'),
    placeId: 'pl-6',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-50',
    type: 'occupation',
    personId: 'p-1',
    description: 'Schmied',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Grandparents
  {
    id: 'e-13',
    type: 'birth',
    personId: 'p-9',
    date: d('1900-05-10'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-14',
    type: 'death',
    personId: 'p-9',
    date: d('1978-12-24'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-15',
    type: 'birth',
    personId: 'p-10',
    date: d('1903-02-14'),
    placeId: 'pl-4',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-16',
    type: 'death',
    personId: 'p-10',
    date: d('1985-08-30'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-17',
    type: 'birth',
    personId: 'p-11',
    date: d('1905-11-20'),
    placeId: 'pl-5',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-18',
    type: 'death',
    personId: 'p-11',
    date: d('1990-03-15'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-19',
    type: 'birth',
    personId: 'p-12',
    date: d('1908-07-04'),
    placeId: 'pl-6',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-20',
    type: 'death',
    personId: 'p-12',
    date: d('1995-01-12'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-51',
    type: 'occupation',
    personId: 'p-9',
    description: 'Bäcker',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-52',
    type: 'military_service',
    personId: 'p-9',
    date: { type: 'range', from: '1939', to: '1945' },
    description: 'Wehrmacht',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Parents
  {
    id: 'e-21',
    type: 'birth',
    personId: 'p-13',
    date: d('1935-09-03'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-22',
    type: 'death',
    personId: 'p-13',
    date: d('2010-06-18'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-23',
    type: 'birth',
    personId: 'p-14',
    date: d('1940-01-25'),
    placeId: 'pl-5',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-53',
    type: 'occupation',
    personId: 'p-13',
    description: 'Ingenieur',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Root person
  {
    id: 'e-24',
    type: 'birth',
    personId: 'p-15',
    date: d('1970-08-12'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-54',
    type: 'occupation',
    personId: 'p-15',
    description: 'Software-Entwickler',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'e-55',
    type: 'education',
    personId: 'p-15',
    date: { type: 'range', from: '1990', to: '1995' },
    description: 'Technische Universität München',
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
];

// ── Relationships ──

const relationships: Relationship[] = [
  // Gen 1 marriages
  {
    id: 'r-1',
    personAId: 'p-1',
    personBId: 'p-2',
    type: 'marriage',
    startDate: approx('1898'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-2',
    personAId: 'p-3',
    personBId: 'p-4',
    type: 'marriage',
    startDate: d('1897-06-15'),
    placeId: 'pl-4',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-3',
    personAId: 'p-5',
    personBId: 'p-6',
    type: 'marriage',
    startDate: d('1900-10-12'),
    placeId: 'pl-5',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-4',
    personAId: 'p-7',
    personBId: 'p-8',
    type: 'marriage',
    placeId: 'pl-6',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Gen 1 → Gen 2 parent-child
  {
    id: 'r-5',
    personAId: 'p-1',
    personBId: 'p-9',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-6',
    personAId: 'p-2',
    personBId: 'p-9',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-7',
    personAId: 'p-3',
    personBId: 'p-10',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-8',
    personAId: 'p-4',
    personBId: 'p-10',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-9',
    personAId: 'p-5',
    personBId: 'p-11',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-10',
    personAId: 'p-6',
    personBId: 'p-11',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-11',
    personAId: 'p-7',
    personBId: 'p-12',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-12',
    personAId: 'p-8',
    personBId: 'p-12',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Gen 2 marriages
  {
    id: 'r-13',
    personAId: 'p-9',
    personBId: 'p-10',
    type: 'marriage',
    startDate: d('1930-06-20'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-14',
    personAId: 'p-11',
    personBId: 'p-12',
    type: 'marriage',
    startDate: d('1932-09-05'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Gen 2 → Gen 3 parent-child
  {
    id: 'r-15',
    personAId: 'p-9',
    personBId: 'p-13',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-16',
    personAId: 'p-10',
    personBId: 'p-13',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-17',
    personAId: 'p-11',
    personBId: 'p-14',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-18',
    personAId: 'p-12',
    personBId: 'p-14',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Gen 3 marriage
  {
    id: 'r-19',
    personAId: 'p-13',
    personBId: 'p-14',
    type: 'marriage',
    startDate: d('1965-05-15'),
    placeId: 'pl-1',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },

  // Gen 3 → Gen 4 parent-child
  {
    id: 'r-20',
    personAId: 'p-13',
    personBId: 'p-15',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'r-21',
    personAId: 'p-14',
    personBId: 'p-15',
    type: 'biological_parent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
];

// ═══════════════════════════════════════════════════════════════════
// Accessor Functions — same signatures the real API will use
// ═══════════════════════════════════════════════════════════════════

/** Enriched person with preferred name and key dates resolved. */
export interface PersonWithDetails extends Person {
  preferredName: PersonName;
  allNames: PersonName[];
  birthEvent?: Event;
  deathEvent?: Event;
  birthPlace?: Place;
}

function enrichPerson(person: Person): PersonWithDetails {
  const allNames = personNames.filter((n) => n.personId === person.id);
  const preferredName = allNames.find((n) => n.isPreferred) ?? allNames[0];
  const personEvents = events.filter((e) => e.personId === person.id);
  const birthEvent = personEvents.find((e) => e.type === 'birth');
  const deathEvent = personEvents.find((e) => e.type === 'death');
  const birthPlace = birthEvent?.placeId
    ? places.find((p) => p.id === birthEvent.placeId)
    : undefined;

  return { ...person, preferredName, allNames, birthEvent, deathEvent, birthPlace };
}

export interface GetPersonsOptions {
  search?: string;
  sortBy?: 'name' | 'birth' | 'death';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getPersons(opts: GetPersonsOptions = {}): PaginatedResult<PersonWithDetails> {
  let result = persons.filter((p) => !p.deletedAt).map(enrichPerson);

  // Search
  if (opts.search) {
    const q = opts.search.toLowerCase();
    result = result.filter((p) => {
      const nameMatch = p.allNames.some(
        (n) =>
          n.given.toLowerCase().includes(q) ||
          n.surname.toLowerCase().includes(q) ||
          (n.maiden?.toLowerCase().includes(q) ?? false) ||
          (n.nickname?.toLowerCase().includes(q) ?? false),
      );
      return nameMatch;
    });
  }

  // Sort
  const sortBy = opts.sortBy ?? 'name';
  const dir = opts.sortDir === 'desc' ? -1 : 1;

  result.sort((a, b) => {
    if (sortBy === 'name') {
      const cmp = a.preferredName.surname.localeCompare(b.preferredName.surname, 'de');
      return cmp !== 0
        ? cmp * dir
        : a.preferredName.given.localeCompare(b.preferredName.given, 'de') * dir;
    }
    if (sortBy === 'birth') {
      const aDate = a.birthEvent?.date?.type === 'exact' ? a.birthEvent.date.date : '';
      const bDate = b.birthEvent?.date?.type === 'exact' ? b.birthEvent.date.date : '';
      return aDate.localeCompare(bDate) * dir;
    }
    if (sortBy === 'death') {
      const aDate = a.deathEvent?.date?.type === 'exact' ? a.deathEvent.date.date : '';
      const bDate = b.deathEvent?.date?.type === 'exact' ? b.deathEvent.date.date : '';
      return aDate.localeCompare(bDate) * dir;
    }
    return 0;
  });

  // Paginate
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 10;
  const total = result.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const items = result.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages };
}

export function getPerson(id: string): PersonWithDetails | undefined {
  const person = persons.find((p) => p.id === id && !p.deletedAt);
  return person ? enrichPerson(person) : undefined;
}

export function getEventsForPerson(personId: string): (Event & { place?: Place })[] {
  return events
    .filter((e) => e.personId === personId && !e.deletedAt)
    .map((e) => ({
      ...e,
      place: e.placeId ? places.find((p) => p.id === e.placeId) : undefined,
    }))
    .sort((a, b) => {
      // Sort birth first, then by date, then death last
      if (a.type === 'birth') return -1;
      if (b.type === 'birth') return 1;
      if (a.type === 'death') return 1;
      if (b.type === 'death') return -1;
      return 0;
    });
}

export function getRelationshipsForPerson(
  personId: string,
): {
  relationship: Relationship;
  relatedPerson: PersonWithDetails;
  role: 'parent' | 'child' | 'partner';
}[] {
  const results: {
    relationship: Relationship;
    relatedPerson: PersonWithDetails;
    role: 'parent' | 'child' | 'partner';
  }[] = [];

  for (const rel of relationships) {
    if (rel.deletedAt) continue;

    const isParentChild = [
      'biological_parent',
      'adoptive_parent',
      'step_parent',
      'foster_parent',
      'guardian',
      'godparent',
    ].includes(rel.type);

    if (isParentChild) {
      if (rel.personAId === personId) {
        // I am the parent, personB is my child
        const child = getPerson(rel.personBId);
        if (child) results.push({ relationship: rel, relatedPerson: child, role: 'child' });
      } else if (rel.personBId === personId) {
        // I am the child, personA is my parent
        const parent = getPerson(rel.personAId);
        if (parent) results.push({ relationship: rel, relatedPerson: parent, role: 'parent' });
      }
    } else {
      // Partner relationship
      if (rel.personAId === personId) {
        const partner = getPerson(rel.personBId);
        if (partner) results.push({ relationship: rel, relatedPerson: partner, role: 'partner' });
      } else if (rel.personBId === personId) {
        const partner = getPerson(rel.personAId);
        if (partner) results.push({ relationship: rel, relatedPerson: partner, role: 'partner' });
      }
    }
  }

  return results;
}

export interface CreatePersonData {
  given: string;
  surname: string;
  sex: Sex;
  birthDate?: GenealogyDate;
  birthPlaceId?: string;
  deathDate?: GenealogyDate;
  notes?: string;
}

export function createPerson(data: CreatePersonData): PersonWithDetails {
  const id = `p-${Date.now()}`;
  const now = new Date().toISOString();

  const person: Person = {
    id,
    sex: data.sex,
    notes: data.notes,
    privacy: 'public',
    createdAt: now,
    updatedAt: now,
  };
  persons.push(person);

  const name: PersonName = {
    id: `n-${Date.now()}`,
    personId: id,
    given: data.given,
    surname: data.surname,
    type: 'birth',
    isPreferred: true,
    createdAt: now,
    updatedAt: now,
  };
  personNames.push(name);

  if (data.birthDate) {
    events.push({
      id: `e-${Date.now()}-b`,
      type: 'birth',
      personId: id,
      date: data.birthDate,
      placeId: data.birthPlaceId,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (data.deathDate) {
    events.push({
      id: `e-${Date.now()}-d`,
      type: 'death',
      personId: id,
      date: data.deathDate,
      createdAt: now,
      updatedAt: now,
    });
  }

  return enrichPerson(person);
}

/** All searchable items for the command palette. */
export interface SearchableItem {
  type: 'person' | 'place';
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

export function getAllSearchableItems(): SearchableItem[] {
  const items: SearchableItem[] = [];

  for (const person of persons) {
    if (person.deletedAt) continue;
    const enriched = enrichPerson(person);
    items.push({
      type: 'person',
      id: person.id,
      label: `${enriched.preferredName.given} ${enriched.preferredName.surname}`,
      sublabel: enriched.birthPlace?.name,
      href: `/persons/${person.id}`,
    });
  }

  for (const place of places) {
    if (place.deletedAt) continue;
    items.push({
      type: 'place',
      id: place.id,
      label: place.name,
      href: '#', // No place detail page yet
    });
  }

  return items;
}

/** Get ancestor tree data for the tree view. */
export interface TreeNode {
  person: PersonWithDetails;
  parents: TreeNode[];
}

export function getAncestorTree(rootId: string, depth = 4): TreeNode | undefined {
  const person = getPerson(rootId);
  if (!person) return undefined;

  if (depth <= 1) {
    return { person, parents: [] };
  }

  const parentRels = relationships.filter(
    (r) =>
      r.personBId === rootId &&
      !r.deletedAt &&
      ['biological_parent', 'adoptive_parent', 'step_parent', 'foster_parent'].includes(r.type),
  );

  const parents = parentRels
    .map((r) => getAncestorTree(r.personAId, depth - 1))
    .filter((n): n is TreeNode => n !== undefined);

  return { person, parents };
}

export function getPlace(id: string): Place | undefined {
  return places.find((p) => p.id === id);
}

export function getAllPlaces(): Place[] {
  return [...places];
}
