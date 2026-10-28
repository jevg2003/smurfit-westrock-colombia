/** Presidencia normative dataset (datos.gov.co). CC BY-SA 4.0, attribution DAPRE (verified 2026-10-20). */
export const DECREES_DATASET_URL = "https://www.datos.gov.co/resource/88h2-dykw.json";
export const DECREES_LICENSE = "CC BY-SA 4.0";
export const DECREES_ATTRIBUTION = "Departamento Administrativo de la Presidencia de la República (DAPRE) vía datos.gov.co";

/** What `/api/regulacion` answers for each publication. */
export interface RegulationApiItem {
  id: string;
  kind: "minambiente" | "decree";
  title: string;
  /** Plain-text subject line. Only decrees have one (the dataset's own description). */
  summary?: string;
  url: string;
  /** ISO 8601, UTC. */
  publishedAt: string;
}

export interface RegulationSourceBlock {
  status: "ok" | "error" | "disabled";
  items: RegulationApiItem[];
  httpStatus?: number;
  message?: string;
  /** True when the company has no keywords yet, so nothing was filtered. */
  unfiltered?: boolean;
}

export interface RegulationResponse {
  minambiente: RegulationSourceBlock;
  presidencia: RegulationSourceBlock;
  /** ISO 8601, UTC. */
  fetchedAt: string;
}

export type RegulationSourceId = "minambiente" | "presidencia";
