import type { TermGroup } from "@/core/text/match";
import { parseFeed } from "./parse";
import { toPlainText } from "./sanitize";

/**
 * Google News RSS search, built on the server only from the configured term groups.
 *
 * ACCEPTED RISK (decided by the user on 2026-10-20, see odd/tasks/centro-inteligencia-entorno.md):
 * the feed's own notice says it is "made available solely for the purpose of rendering Google News
 * results within a personal feed reader for personal, non-commercial use". Mitigations: only title,
 * outlet, date and link are shown (no content republished), results are cached for 30 minutes, the
 * number of queries is bounded, and `FEATURE_GOOGLE_NEWS=false` switches the source off without a deploy.
 */
export const GOOGLE_NEWS_MAX_QUERIES = 4;
export const GOOGLE_NEWS_MAX_TERMS_PER_QUERY = 6;
const FALLBACK_OUTLET = "Google News";

/** Characters that could change the structure of a search query are removed from every term. */
const cleanTerm = (term: string) => term.replace(/[^\p{L}\p{N} .&'-]+/gu, " ").replace(/\s+/g, " ").trim();

/**
 * One OR query per group (at most `GOOGLE_NEWS_MAX_QUERIES`, at most `GOOGLE_NEWS_MAX_TERMS_PER_QUERY`
 * terms each). Multi-word terms are quoted so Google matches the phrase.
 */
export function buildGoogleNewsQueries(groups: readonly TermGroup[]): string[] {
  return groups
    .map((group) =>
      group.terms
        .map(cleanTerm)
        .filter((term) => term.length > 0)
        .slice(0, GOOGLE_NEWS_MAX_TERMS_PER_QUERY)
        .map((term) => (term.includes(" ") ? `"${term}"` : term))
        .join(" OR "),
    )
    .filter((query) => query.length > 0)
    .slice(0, GOOGLE_NEWS_MAX_QUERIES);
}

export function buildGoogleNewsUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es-419&gl=CO&ceid=CO:es-419`;
}

export interface GoogleHeadline {
  title: string;
  url: string;
  publishedAt: string;
  /** The original outlet, not Google. */
  outlet: string;
}

const SUFFIX = /^(.*\S)\s+[-–]\s+([^-–]{2,60})$/;

/** Items of a Google News feed with the original outlet (`<source>`) and the title without its " - Outlet" suffix. */
export function parseGoogleNews(xml: string): GoogleHeadline[] {
  return parseFeed(xml).map((item) => {
    const suffix = SUFFIX.exec(item.title);
    const outlet = item.source ? toPlainText(item.source, 80) : (suffix?.[2].trim() ?? FALLBACK_OUTLET);
    const title = suffix && suffix[2].trim() === outlet ? suffix[1].trim() : item.title;
    return { title, url: item.url, publishedAt: item.publishedAt, outlet };
  });
}
