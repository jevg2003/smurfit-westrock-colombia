export type SourceId =
  | "trm"
  | "secop"
  | "supersociedades"
  | "world-bank"
  | "xm"
  | "exports"
  | "news-rss"
  | "google-news"
  | "minambiente"
  | "presidencia"
  | "curated";

export interface Provenance {
  sourceId: SourceId;
  url: string;
  /** ISO 8601, UTC. */
  fetchedAt: string;
  /** For example "CC BY-SA 4.0". */
  license: string;
  /** For example "Superfinanciera via datos.gov.co". */
  attribution: string;
  /** True for content curated by hand (regulation entries). */
  curated?: boolean;
}
