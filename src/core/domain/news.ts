import type { Provenance } from "./provenance";

/** Where a headline came from: a media RSS feed or a Google News RSS search. */
export type NewsVia = "rss" | "google-news";

/** A term that matched a headline, with the term group it belongs to. */
export interface NewsMatch {
  groupId: string;
  term: string;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  /** The media outlet. For Google News items it is the original outlet (the `<source>` element). */
  outlet: string;
  /** ISO 8601, UTC. */
  publishedAt: string;
  via: NewsVia;
  matchedTerms: string[];
  matches: NewsMatch[];
  provenance: Provenance;
}
