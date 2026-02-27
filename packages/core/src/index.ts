/**
 * @ahnenbaum/core — Shared types, constants, and plugin API
 *
 * This barrel file re-exports everything that other packages
 * (server, client, plugins) are allowed to import.
 */

export { APP_NAME, APP_VERSION } from './constants';
export type { HealthStatus } from './types';

// ── Result types ─────────────────────────────────────────────────────
export type { Result, AppError, ErrorCode } from './result';
export { ok, err } from './result';

// ── Domain models ────────────────────────────────────────────────────
export type {
  // Date
  GenealogyDate,
  DateType,
  ExactDate,
  ApproximateDate,
  RangeDate,
  BeforeDate,
  AfterDate,
  // Person
  Person,
  PersonName,
  PersonNameType,
  Sex,
  PrivacyLevel,
  // Relationship
  Relationship,
  RelationshipType,
  ParentChildRelationshipType,
  PartnerRelationshipType,
  // Event
  Event,
  EventType,
  // Place
  Place,
  // Source & Citation
  Source,
  Citation,
  CitationConfidence,
  // Media
  Media,
  MediaType,
  MediaLink,
  MediaLinkEntityType,
} from './models/index';
export { PARENT_CHILD_TYPES } from './models/index';

// ── Auth types ───────────────────────────────────────────────────────
export type { AuthMode, UserRole, Session } from './models/auth';

// ── Plugin API ───────────────────────────────────────────────────────
export type {
  AhnenbaumPlugin,
  PluginMetadata,
  PluginStatus,
  PluginContext,
  PluginLogger,
  HookName,
  HookPayloads,
  HookRegistration,
  Disposable,
  RouteDefinition,
  RouteMethod,
  PanelSlot,
  PanelDefinition,
  SchemaExtension,
} from './plugin-api/index';
