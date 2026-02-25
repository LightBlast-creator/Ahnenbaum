/**
 * Genealogy date types.
 *
 * Dates in genealogy are often imprecise — "about 1890", "before 1900",
 * "between 1850 and 1860". This discriminated union captures all variants.
 *
 * Stored as JSON in the database. Serialized/deserialized by services.
 */

/** Exact known date: "1985-03-15" */
export interface ExactDate {
  readonly type: 'exact';
  /** ISO 8601 date string (YYYY-MM-DD or YYYY-MM or YYYY) */
  readonly date: string;
}

/** Approximate date: "about 1890" */
export interface ApproximateDate {
  readonly type: 'approximate';
  /** ISO 8601 date string (YYYY-MM-DD or YYYY-MM or YYYY) */
  readonly date: string;
}

/** Date range: "between 1850 and 1860" */
export interface RangeDate {
  readonly type: 'range';
  readonly from: string;
  readonly to: string;
}

/** Before a date: "before 1900" */
export interface BeforeDate {
  readonly type: 'before';
  readonly date: string;
}

/** After a date: "after 1800" */
export interface AfterDate {
  readonly type: 'after';
  readonly date: string;
}

/**
 * Discriminated union of all genealogy date variants.
 *
 * Use `type` to narrow:
 * ```ts
 * if (d.type === 'exact') { d.date }
 * if (d.type === 'range') { d.from; d.to }
 * ```
 */
export type GenealogyDate = ExactDate | ApproximateDate | RangeDate | BeforeDate | AfterDate;

/** All possible date type discriminators. */
export type DateType = GenealogyDate['type'];
