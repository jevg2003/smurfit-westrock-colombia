import { XMLParser } from "fast-xml-parser";
import { canonicalUrl, toPlainText } from "./sanitize";

/** The only fields kept from a feed item: no body, no images. */
export interface Headline {
  title: string;
  url: string;
  /** ISO 8601, UTC. */
  publishedAt: string;
}

/** A Google News item also carries the original outlet (its `<source>` element). */
export interface HeadlineWithSource extends Headline {
  source?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  // Entities stay raw so `sanitize` can strip real tags before decoding (escaped markup stays inert).
  processEntities: false,
  isArray: (name) => name === "item" || name === "entry",
});

const ZONELESS = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;

/** RFC 822 and ISO dates. A date with no zone (Valora Analitik) is read as UTC, as its feed publishes. */
function toIsoDate(raw: string): string | undefined {
  const text = raw.trim();
  const time = Date.parse(ZONELESS.test(text) ? `${text.replace(" ", "T")}Z` : text);
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}

const textOf = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "#text" in value) return String((value as { "#text": unknown })["#text"]);
  return "";
};

/**
 * Items of an RSS 2.0 feed as `{title, url, publishedAt}`. Titles are plain text, links must be
 * http(s), items without a valid date are dropped. Malformed XML or a non-feed gives no items.
 */
export function parseFeed(xml: string): HeadlineWithSource[] {
  let document: unknown;
  try {
    document = parser.parse(xml.replace(/^\uFEFF/, ""));
  } catch {
    return [];
  }
  const items = (document as { rss?: { channel?: { item?: unknown[] } } })?.rss?.channel?.item;
  if (!Array.isArray(items)) return [];

  return items.flatMap((entry): HeadlineWithSource[] => {
    const raw = entry as Record<string, unknown>;
    const title = toPlainText(textOf(raw.title));
    const url = canonicalUrl(textOf(raw.link));
    const publishedAt = toIsoDate(textOf(raw.pubDate));
    if (!title || !url || !publishedAt) return [];
    const source = toPlainText(textOf(raw.source), 80);
    return [{ title, url, publishedAt, ...(source ? { source } : {}) }];
  });
}
