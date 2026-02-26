/**
 * Schema extension types — stub for future plugin schema extensions.
 *
 * This is intentionally minimal. Plugins will eventually be able to
 * declare additional database tables or columns. For now, this is
 * a placeholder to establish the shape.
 */

export interface SchemaExtension {
  /** Unique name for this schema extension */
  name: string;
  /** SQL statements to create the extension tables/columns */
  up: string[];
  /** SQL statements to revert the extension */
  down: string[];
}
