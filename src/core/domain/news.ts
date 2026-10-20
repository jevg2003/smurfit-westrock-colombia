import type { Provenance } from "./provenance";

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  outlet: string;
  publishedAt: string;
  matchedTerms: string[];
  provenance: Provenance;
}
