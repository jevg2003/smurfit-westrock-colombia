import type { NewsItem } from "../domain/news";
import { matchTermGroups, type TermGroup } from "../text/match";

/** Headlines with the terms of the current groups that appear in their title. Pure; the input is not changed. */
export function matchNewsItems(items: readonly NewsItem[], groups: readonly TermGroup[]): NewsItem[] {
  return items.map((item) => {
    const matches = matchTermGroups(item.title, groups);
    return { ...item, matches, matchedTerms: matches.map((match) => match.term) };
  });
}
