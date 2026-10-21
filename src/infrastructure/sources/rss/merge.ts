import { canonicalUrl, titleKey } from "./sanitize";

export type HeadlineVia = "rss" | "google-news";

export interface SourcedHeadline {
  title: string;
  url: string;
  publishedAt: string;
  outlet: string;
  via: HeadlineVia;
  feedId: string;
}

export interface MergedHeadline extends SourcedHeadline {
  id: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** FNV-1a, 32 bit: a short stable id, not a security hash. */
function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * One list from every feed: dedupes by canonical URL and by normalized title (a direct media link
 * wins over the same story found through Google News), keeps the last 12 months and drops dates
 * more than a day in the future, newest first.
 */
export function mergeHeadlines(headlines: readonly SourcedHeadline[], now: Date): MergedHeadline[] {
  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  const until = now.getTime() + DAY_MS;

  const direct = headlines.filter((h) => h.via === "rss");
  const viaGoogle = headlines.filter((h) => h.via === "google-news");

  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const merged: MergedHeadline[] = [];
  for (const headline of [...direct, ...viaGoogle]) {
    const time = Date.parse(headline.publishedAt);
    if (!(time >= from.getTime() && time <= until)) continue;
    const url = canonicalUrl(headline.url);
    if (!url) continue;
    const titleId = titleKey(headline.title, headline.outlet);
    if (seenUrls.has(url) || seenTitles.has(titleId)) continue;
    seenUrls.add(url);
    seenTitles.add(titleId);
    merged.push({ ...headline, url, id: `news:${shortHash(url)}` });
  }
  return merged.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id));
}
