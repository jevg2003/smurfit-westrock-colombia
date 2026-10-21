import type { NewsItem } from "../domain/news";
import { matchTermGroups, type TermGroup } from "../text/match";

/** Headlines with the terms of the current groups that appear in their title. Pure; the input is not changed. */
export function matchNewsItems(items: readonly NewsItem[], groups: readonly TermGroup[]): NewsItem[] {
  return items.map((item) => {
    const matches = matchTermGroups(item.title, groups);
    return { ...item, matches, matchedTerms: matches.map((match) => match.term) };
  });
}

/** Headlines that mention at least one active term. Pure; the input is not changed. */
export function filterRelevantNews(items: readonly NewsItem[]): NewsItem[] {
  return items.filter((item) => item.matches.length > 0);
}

/** Group priority on the news screen: the company first, operational noise last. */
const RELEVANCE_ORDER = ["company", "sector", "regulation", "operations"];

const rank = (item: NewsItem) => {
  const ranks = item.matches.map((match) => RELEVANCE_ORDER.indexOf(match.groupId)).map((index) => (index < 0 ? RELEVANCE_ORDER.length : index));
  return ranks.length > 0 ? Math.min(...ranks) : RELEVANCE_ORDER.length + 1;
};

/** Most relevant group first (company > sector > regulation > operations > unmatched), then newest first. */
export function sortByRelevance(items: readonly NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => rank(a) - rank(b) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id));
}
