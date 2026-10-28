import { termName, type TermGroup } from "@/core/text/match";
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
export const GOOGLE_NEWS_MAX_QUERIES = 6;
/** Upper bound of the query text, so the URL stays short and Google does not reject it. */
export const GOOGLE_NEWS_MAX_QUERY_LENGTH = 400;
/** Google News only looks at headlines of this recent window. */
export const GOOGLE_NEWS_RECENCY = "when:30d";
/** One noisy query can never flood the list: at most this many newest items are kept per group. */
export const GOOGLE_NEWS_MAX_ITEMS_PER_GROUP = 25;
/** A term with context words asks Google for at most this many of them, so the query stays short. */
export const GOOGLE_NEWS_MAX_CONTEXT_WORDS = 3;
const FALLBACK_OUTLET = "Google News";

/** Characters that could change the structure of a search query are removed from every term. */
const cleanTerm = (term: string) => term.replace(/[^\p{L}\p{N} .&'-]+/gu, " ").replace(/\s+/g, " ").trim();

export interface GoogleNewsSearch {
  groupId: string;
  query: string;
}

/**
 * Every term of every group becomes part of some query: the terms are quoted exact phrases joined with OR and packed,
 * in order, into as many queries per group as the length limit needs, limited to the last 30 days. Single words are
 * quoted too, so Google never searches a generic word on its own. The total is capped at `GOOGLE_NEWS_MAX_QUERIES`:
 * the first query of each group goes first (so no group is starved), then the extra queries share what is left.
 */
export function buildGoogleNewsSearches(groups: readonly TermGroup[]): GoogleNewsSearch[] {
  const wrap = (phrases: string[]) => `(${phrases.join(" OR ")}) ${GOOGLE_NEWS_RECENCY}`;
  const pack = (group: TermGroup): string[] => {
    const queries: string[] = [];
    let phrases: string[] = [];
    for (const term of group.terms.map((spec) => cleanTerm(termName(spec))).filter((value) => value.length > 0)) {
      const phrase = `"${term}"`;
      if (wrap([phrase]).length > GOOGLE_NEWS_MAX_QUERY_LENGTH) continue;
      if (phrases.length > 0 && wrap([...phrases, phrase]).length > GOOGLE_NEWS_MAX_QUERY_LENGTH) {
        queries.push(wrap(phrases));
        phrases = [];
      }
      phrases.push(phrase);
    }
    if (phrases.length > 0) queries.push(wrap(phrases));
    return queries;
  };
  const packed = groups.map((group) => ({ groupId: group.id, queries: pack(group) })).filter((entry) => entry.queries.length > 0);
  const kept = packed.map(() => 0);
  let budget = GOOGLE_NEWS_MAX_QUERIES;
  for (let round = 0; budget > 0; round++) {
    let added = false;
    packed.forEach((entry, index) => {
      if (budget > 0 && round < entry.queries.length) {
        kept[index] = round + 1;
        budget--;
        added = true;
      }
    });
    if (!added) break;
  }
  return packed.flatMap((entry, index) => entry.queries.slice(0, kept[index]).map((query) => ({ groupId: entry.groupId, query })));
}

export function buildGoogleNewsQueries(groups: readonly TermGroup[]): string[] {
  return buildGoogleNewsSearches(groups).map((search) => search.query);
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
