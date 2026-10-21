import type { Provenance } from "./provenance";

/** A norm chosen by hand. Always `curated`; shown with the date it was last reviewed. */
export interface RegulationEntry {
  id: string;
  name: string;
  /** ISO date (`YYYY-MM-DD`) on which the norm was issued. */
  date: string;
  topic: string;
  whyItMatters: string;
  /** Official link, or null when none could be verified. */
  url: string | null;
  /** Name of the site the link points to, for example "Gestor normativo de Función Pública". */
  urlLabel?: string;
  /** ISO date (`YYYY-MM-DD`) of the last manual review. */
  reviewedAt: string;
  curated: true;
  provenance: Provenance;
}

/** A publication from a regulation feed: a Minambiente post or a Presidencia decree. */
export interface RegulationItem {
  id: string;
  kind: "minambiente" | "decree";
  title: string;
  /** Short plain-text description, when the source gives one. */
  summary?: string;
  url: string;
  /** ISO 8601, UTC. */
  publishedAt: string;
  provenance: Provenance;
}
