import type { Provenance } from "./provenance";

export interface RegulationEntry {
  id: string;
  name: string;
  date: string;
  topic: string;
  whyItMatters: string;
  url: string;
  reviewedAt: string;
  provenance: Provenance;
}
