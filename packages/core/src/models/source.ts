/**
 * Source & Citation — genealogical evidence model.
 *
 * Follows the standard evidence chain:
 *   Source (e.g. "Parish Register of Munich, 1850-1900")
 *     → Citation (e.g. "Entry for Johann Müller, baptism, p. 42")
 *       → Event/Fact (e.g. "Birth of Johann Müller, 1872-03-15")
 *
 * A Source can have many Citations.
 * A Citation can be linked to many Events (via citationId on the event).
 */

/**
 * Source — an original record or publication.
 */
export interface Source {
  readonly id: string;
  readonly title: string;
  readonly author?: string;
  readonly publisher?: string;
  readonly publicationDate?: string;
  /** Where the source is physically/digitally held. */
  readonly repositoryName?: string;
  /** URL for online sources. */
  readonly url?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}

/** Confidence level for a citation's evidence quality. */
export type CitationConfidence = 'primary' | 'secondary' | 'questionable' | 'unreliable';

/**
 * Citation — a specific reference within a source.
 */
export interface Citation {
  readonly id: string;
  readonly sourceId: string;
  /** Descriptive detail of what the citation refers to. */
  readonly detail?: string;
  /** Page, folio, or entry number within the source. */
  readonly page?: string;
  readonly confidence?: CitationConfidence;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}
