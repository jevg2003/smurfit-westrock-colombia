"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { COLOMBIAN_OUTLETS } from "@/content/config/empresa";
import type { NewsItem } from "@/core/domain/news";
import type { TermGroup } from "@/core/text/match";
import { filterRelevantNews, matchNewsItems, sortByRelevance } from "@/core/usecases/match-news";
import type { FeedHealth } from "@/infrastructure/sources/rss/service";
import { buildNewsTermGroups, usePreferencesStore } from "@/stores/preferences.store";
import { getContainer } from "./container";
import { SourceFailure } from "./source-failure";
import { toSourceView } from "./source-view";

export interface NewsData {
  /** Raw headlines, before matching (matching follows the user's preferences). */
  items: NewsItem[];
  feeds: FeedHealth[];
  /** True when the server flag switched the source off ("fuente desactivada"). */
  off: boolean;
}

/** The news term groups with the terms and the context/exclusion words the user has configured in Preferencias. */
export function useNewsTermGroups(): TermGroup[] {
  const newsTermGroups = usePreferencesStore((state) => state.newsTermGroups);
  const newsContext = usePreferencesStore((state) => state.newsContext);
  return useMemo(() => buildNewsTermGroups({ newsTermGroups, newsContext }), [newsTermGroups, newsContext]);
}

/** Colombian media and Google News headlines, read from our own `/api/news` route. */
export function useNews() {
  const query = useQuery<NewsData>({
    queryKey: ["news"],
    retry: false,
    staleTime: 30 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const { news, clock } = getContainer();
      const result = await news.fetch({}, { signal, now: clock.now() });
      if (result.ok) return { items: result.value.data.items, feeds: result.value.data.feeds, off: false };
      if (result.error.kind === "disabled") return { items: [], feeds: [], off: true };
      if (result.error.kind === "empty") return { items: [], feeds: [], off: false };
      throw new SourceFailure(result.error);
    },
  });
  const groups = useNewsTermGroups();
  // Every headline, matched against the user's terms and ordered by relevance (company first, unmatched last,
  // Colombian outlets ahead of the rest inside a group). A Colombian outlet stands in for the context words.
  const items = useMemo(
    () => sortByRelevance(matchNewsItems(query.data?.items ?? [], groups, COLOMBIAN_OUTLETS), COLOMBIAN_OUTLETS),
    [query.data, groups],
  );
  // Only the headlines that mention at least one active term: what the radar and the timeline may use.
  const relevantItems = useMemo(() => filterRelevantNews(items), [items]);
  return { query, view: toSourceView(query), data: query.data, items, relevantItems, groups, fetchedAt: query.dataUpdatedAt };
}
