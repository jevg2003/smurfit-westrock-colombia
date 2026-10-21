"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { NEWS_TERM_GROUPS } from "@/content/config/empresa";
import type { NewsItem } from "@/core/domain/news";
import type { TermGroup } from "@/core/text/match";
import { matchNewsItems } from "@/core/usecases/match-news";
import type { FeedHealth } from "@/infrastructure/sources/rss/service";
import { usePreferencesStore } from "@/stores/preferences.store";
import { getContainer } from "./container";
import { toSourceView } from "./source-view";

export interface NewsData {
  /** Headlines without matched terms (matching follows the user's preferences). */
  items: NewsItem[];
  feeds: FeedHealth[];
  /** True when the server flag switched the source off ("fuente desactivada"). */
  off: boolean;
}

/** The news term groups with the terms the user has configured in Preferencias. */
export function useNewsTermGroups(): TermGroup[] {
  const groups = usePreferencesStore((state) => state.newsTermGroups);
  return useMemo(() => NEWS_TERM_GROUPS.map((group) => ({ id: group.id, label: group.label, terms: groups[group.id] ?? group.terms })), [groups]);
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
      throw new Error(result.error.message);
    },
  });
  const groups = useNewsTermGroups();
  const items = useMemo(() => matchNewsItems(query.data?.items ?? [], groups), [query.data, groups]);
  return { query, view: toSourceView(query), data: query.data, items, groups, fetchedAt: query.dataUpdatedAt };
}
