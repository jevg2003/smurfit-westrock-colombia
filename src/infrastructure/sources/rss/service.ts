import type { Fetcher } from "@/infrastructure/http/fetcher";
import type { SourceFlags } from "@/infrastructure/flags";
import { fetchFeed } from "./fetch-feed";
import { NEWS_FEEDS, type NewsFeedId } from "./feeds";
import { mergeHeadlines, type SourcedHeadline } from "./merge";

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
  /** One feed of the closed list; absent means all of them. */
  feedId?: NewsFeedId;
  limit: number;
}

/**
 * Headlines from the closed list of media feeds, merged and deduped. Each feed is fetched on its
 * own with its own timeout: a failing feed shows up in `feeds` and never fails the others.
 */
export async function loadNews({ fetcher, now, flags, feedId, limit }: LoadNewsOptions): Promise<NewsResponse> {
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

  const items = mergeHeadlines(
    results.flatMap((r) => r.headlines),
    now,
  )
    .slice(0, limit)
    .map(({ id, title, url, outlet, publishedAt, via, feedId: source }): NewsApiItem => ({ id, title, url, outlet, publishedAt, via, feedId: source }));
  return { items, feeds: results.map((r) => r.health), fetchedAt: now.toISOString() };
}
