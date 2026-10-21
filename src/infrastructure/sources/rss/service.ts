import { COLOMBIAN_OUTLETS, DEFAULT_NEWS_CONTEXT, NEWS_TERM_GROUPS } from "@/content/config/empresa";
import { matchTermGroups, type TermGroup } from "@/core/text/match";
import { buildTermGroup } from "@/core/text/term-groups";
import { isColombianOutlet } from "@/core/usecases/match-news";
import type { Fetcher } from "@/infrastructure/http/fetcher";
import type { SourceFlags } from "@/infrastructure/flags";
import { fetchFeed } from "./fetch-feed";
import { GOOGLE_NEWS_ID, NEWS_FEEDS, type NewsSourceId } from "./feeds";
import { GOOGLE_NEWS_MAX_ITEMS_PER_GROUP, buildGoogleNewsSearches, buildGoogleNewsUrl, parseGoogleNews } from "./google-news";
import { mergeHeadlines, type SourcedHeadline } from "./merge";

/** The default groups with their Colombian context and exclusion words. The server searches with these. */
export const DEFAULT_SEARCH_GROUPS: readonly TermGroup[] = NEWS_TERM_GROUPS.map((group) => buildTermGroup(group, DEFAULT_NEWS_CONTEXT[group.id]));

/** Whether a headline passes the term groups; a Colombian outlet stands in for the context words. */
const isRelevant = (item: { title: string; outlet: string }, groups: readonly TermGroup[]) =>
  matchTermGroups(item.title, groups, { contextAssumed: isColombianOutlet(item.outlet, COLOMBIAN_OUTLETS) }).length > 0;

export interface NewsApiItem {
  id: string;
  title: string;
  url: string;
  outlet: string;
  /** ISO 8601, UTC. */
  publishedAt: string;
  via: "rss" | "google-news";
  feedId: string;
}

export interface FeedHealth {
  id: string;
  outlet: string;
  status: "ok" | "error" | "disabled";
  count: number;
  httpStatus?: number;
  message?: string;
}

export interface NewsResponse {
  items: NewsApiItem[];
  feeds: FeedHealth[];
  /** ISO 8601, UTC. */
  fetchedAt: string;
}

export interface LoadNewsOptions {
  fetcher: Fetcher;
  now: Date;
  flags: SourceFlags;
  /** One source of the closed list (a media feed or Google News); absent means all of them. */
  feedId?: NewsSourceId;
  limit: number;
  /** Term groups for the Google News queries. The client can never change them. */
  termGroups?: readonly TermGroup[];
  /** Newest Google News items kept per term group. */
  googleItemsPerGroup?: number;
}

/**
 * Headlines from the closed list of media feeds, merged and deduped. Each feed is fetched on its
 * own with its own timeout: a failing feed shows up in `feeds` and never fails the others.
 */
export async function loadNews({
  fetcher,
  now,
  flags,
  feedId,
  limit,
  termGroups = DEFAULT_SEARCH_GROUPS,
  googleItemsPerGroup = GOOGLE_NEWS_MAX_ITEMS_PER_GROUP,
}: LoadNewsOptions): Promise<NewsResponse> {
  const selected = NEWS_FEEDS.filter((feed) => !feedId || feed.id === feedId);

  const results = await Promise.all(
    selected.map(async (feed) => {
      if (!flags.newsRss) {
        const health: FeedHealth = { id: feed.id, outlet: feed.outlet, status: "disabled", count: 0, message: "Fuente desactivada." };
        return { health, headlines: [] as SourcedHeadline[] };
      }
      const result = await fetchFeed(fetcher, feed.url);
      const headlines = result.items.map(
        (item): SourcedHeadline => ({ title: item.title, url: item.url, publishedAt: item.publishedAt, outlet: feed.outlet, via: "rss", feedId: feed.id }),
      );
      const health: FeedHealth = {
        id: feed.id,
        outlet: feed.outlet,
        status: result.ok ? "ok" : "error",
        count: headlines.length,
        ...(result.httpStatus ? { httpStatus: result.httpStatus } : {}),
        ...(result.message ? { message: result.message } : {}),
      };
      return { health, headlines };
    }),
  );

  const google = !feedId || feedId === GOOGLE_NEWS_ID ? await loadGoogleNews(fetcher, flags.googleNews, termGroups, googleItemsPerGroup) : undefined;
  if (google) results.push(google);

  const merged = mergeHeadlines(
    results.flatMap((r) => r.headlines),
    now,
  );
  const items = keepMostRelevant(merged, termGroups, limit).map(({ id, title, url, outlet, publishedAt, via, feedId: source }): NewsApiItem => ({ id, title, url, outlet, publishedAt, via, feedId: source }));
  return { items, feeds: results.map((r) => r.health), fetchedAt: now.toISOString() };
}

/**
 * When the limit cuts the list, headlines that match none of the default terms go first, so a flood of
 * unrelated media headlines cannot push a relevant one out. The result stays newest first.
 */
function keepMostRelevant<T extends { title: string; outlet: string }>(merged: readonly T[], groups: readonly TermGroup[], limit: number): T[] {
  if (merged.length <= limit) return [...merged];
  const indexed = merged.map((item, index) => ({ item, index, relevant: isRelevant(item, groups) }));
  const kept = [...indexed.filter((entry) => entry.relevant), ...indexed.filter((entry) => !entry.relevant)].slice(0, limit);
  return kept.sort((a, b) => a.index - b.index).map((entry) => entry.item);
}

/**
 * Google News RSS searches (server-side URLs only). Each query is fetched on its own: some failing
 * queries leave the others intact and are counted in the health message.
 */
async function loadGoogleNews(fetcher: Fetcher, enabled: boolean, termGroups: readonly TermGroup[], perGroup: number) {
  const base = { id: GOOGLE_NEWS_ID, outlet: "Google News" };
  if (!enabled) {
    const health: FeedHealth = { ...base, status: "disabled", count: 0, message: "Fuente desactivada." };
    return { health, headlines: [] as SourcedHeadline[] };
  }
  const searches = buildGoogleNewsSearches(termGroups);
  const results = await Promise.all(searches.map((search) => fetchFeed(fetcher, buildGoogleNewsUrl(search.query), parseGoogleNews)));
  // A headline that does not pass its group's context rules (a football sponsorship, news from Spain) is dropped
  // before the per-group cap, so it can never push a Colombian headline out.
  const headlines = results.flatMap((result, index) =>
    [...result.items]
      .filter((item) => isRelevant(item, termGroups.filter((group) => group.id === searches[index]?.groupId)))
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .slice(0, perGroup)
      .map(
      (item): SourcedHeadline => ({ title: item.title, url: item.url, publishedAt: item.publishedAt, outlet: item.outlet, via: "google-news", feedId: GOOGLE_NEWS_ID }),
    ),
  );
  const failed = results.filter((result) => !result.ok);
  const failedMessage = failed.length > 0 ? `${failed.length} de ${results.length} consultas fallaron.` : undefined;
  const health: FeedHealth = {
    ...base,
    status: failed.length === results.length ? "error" : "ok",
    count: headlines.length,
    ...(failedMessage ? { message: failedMessage } : {}),
    ...(failed.length === results.length && failed[0]?.httpStatus ? { httpStatus: failed[0].httpStatus } : {}),
  };
  return { health, headlines };
}
