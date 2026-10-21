/**
 * The closed list of feeds the server may fetch. The client can only name an id from this list;
 * it can never pass a URL (no open proxy, no SSRF). All URLs were re-verified live on 2026-10-20
 * (HTTP 200 RSS 2.0, see the feature doc).
 */
export interface FeedConfig {
  id: string;
  outlet: string;
  url: string;
}

export const NEWS_FEEDS = [
  { id: "portafolio", outlet: "Portafolio", url: "https://www.portafolio.co/rss/economia.xml" },
  { id: "larepublica", outlet: "La República", url: "https://www.larepublica.co/rss" },
  { id: "eltiempo", outlet: "El Tiempo", url: "https://www.eltiempo.com/rss/economia.xml" },
  { id: "valora", outlet: "Valora Analitik", url: "https://www.valoraanalitik.com/feed/" },
  { id: "elcolombiano", outlet: "El Colombiano", url: "https://www.elcolombiano.com/rss/negocios.xml" },
] as const satisfies readonly FeedConfig[];

export type NewsFeedId = (typeof NEWS_FEEDS)[number]["id"];

export const NEWS_FEED_IDS = NEWS_FEEDS.map((feed) => feed.id) as [NewsFeedId, ...NewsFeedId[]];

/** Identifier of the Google News search in responses and health entries (not a feed URL). */
export const GOOGLE_NEWS_ID = "google-news";

/** What a client may ask for: one media feed or the Google News search. */
export const NEWS_SOURCE_IDS = [...NEWS_FEED_IDS, GOOGLE_NEWS_ID] as [NewsFeedId | typeof GOOGLE_NEWS_ID, ...(NewsFeedId | typeof GOOGLE_NEWS_ID)[]];

export type NewsSourceId = (typeof NEWS_SOURCE_IDS)[number];
