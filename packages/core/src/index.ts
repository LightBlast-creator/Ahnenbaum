/**
 * @ahnenbaum/core — Shared types, constants, and plugin API
 *
 * This barrel file re-exports everything that other packages
 * (server, client, plugins) are allowed to import.
 */

export { APP_NAME, APP_VERSION } from './constants.ts';
export type { HealthStatus } from './types.ts';

// ── Result types ─────────────────────────────────────────────────────
export type { Result, AppError, ErrorCode } from './result.ts';
export { ok, err } from './result.ts';

// ── Validation ───────────────────────────────────────────────────────
export type { ValidationError } from './validation.ts';
export {
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_PLACE_NAME_LENGTH,
  MAX_SOURCE_TITLE_LENGTH,
  ALLOWED_SEX_VALUES,
  ALLOWED_PRIVACY_VALUES,
  ALLOWED_NAME_TYPES,
  validateSex,
  validatePrivacy,
  validateNameType,
  validateMaxLength,
  validateRequired,
  validateNotSelfReferencing,
} from './validation.ts';

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
  RelationshipRow,
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
  // Search
  SearchEntityType,
} from './models/index.ts';
export { PARENT_CHILD_TYPES } from './models/index.ts';

// ── Auth types ───────────────────────────────────────────────────────
export type { AuthMode, UserRole, Session } from './models/auth.ts';

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
} from './plugin-api/index.ts';

// ── WebSocket types ──────────────────────────────────────────────────
export type {
  WsMessage,
  PresenceUser,
  PresenceListPayload,
  PresenceJoinPayload,
  PresenceLeavePayload,
} from './ws-types.ts';
