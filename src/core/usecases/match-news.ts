import type { NewsItem } from "../domain/news";
import { matchTermGroups, normalizeText, type TermGroup } from "../text/match";

const outletKey = (name: string) => normalizeText(name);

/** Whether the outlet is in the closed list of Colombian outlets (whole name, ignoring case, accents and punctuation). */
export function isColombianOutlet(outlet: string, colombianOutlets: readonly string[]): boolean {
  const key = outletKey(outlet);
  return colombianOutlets.some((name) => outletKey(name) === key);
}

/**
 * Headlines with the terms of the current groups that appear in their title. A headline from a Colombian outlet
 * does not need the context words (the outlet already ties it to Colombia); excluded words still apply.
 * Pure; the input is not changed.
 */
export function matchNewsItems(items: readonly NewsItem[], groups: readonly TermGroup[], colombianOutlets: readonly string[] = []): NewsItem[] {
  return items.map((item) => {
    const matches = matchTermGroups(item.title, groups, { contextAssumed: isColombianOutlet(item.outlet, colombianOutlets) });
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

/**
 * Most relevant group first (company > sector > regulation > operations > unmatched). Inside a group, items from
 * the given Colombian outlets (matched by whole outlet name, ignoring case, accents and punctuation) come first,
 * then newest first.
 */
export function sortByRelevance(items: readonly NewsItem[], colombianOutlets: readonly string[] = []): NewsItem[] {
  const abroad = (item: NewsItem) => (isColombianOutlet(item.outlet, colombianOutlets) ? 0 : 1);
  return [...items].sort(
    (a, b) => rank(a) - rank(b) || abroad(a) - abroad(b) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id),
  );
}
