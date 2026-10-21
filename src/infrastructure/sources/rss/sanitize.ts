import { safeHttpUrl } from "@/lib/safe-url";
import { normalizeText } from "@/core/text/match";

const MAX_TITLE_LENGTH = 300;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  laquo: "«",
  raquo: "»",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

// C0/C1 controls, zero-width characters and the bidirectional overrides and isolates.
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const UNSAFE_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;

/**
 * Untrusted feed text as plain text: real tags are removed first, then entities are decoded, so
 * escaped markup (`&lt;b&gt;`) only ever becomes inert characters. Control and bidirectional
 * characters are removed, whitespace is collapsed and the length is capped.
 */
export function toPlainText(raw: string, maxLength = MAX_TITLE_LENGTH): string {
  const withoutTags = raw.replace(/<[^>]*>/g, "");
  const text = decodeEntities(withoutTags)
    .replace(/[\t\n\r]+/g, " ")
    .replace(UNSAFE_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, maxLength);
}

/** Tracking parameters that never change which article a link points to. */
const TRACKING_PARAM = /^(utm_[a-z0-9_]+|fbclid|gclid|mc_cid|mc_eid|igshid|ref|ref_src)$/i;

/**
 * A comparable form of an http(s) link: lowercase host, no hash, no tracking parameters, no trailing
 * slash. Returns undefined for anything that is not an http(s) URL (javascript:, data:, ftp:...).
 */
export function canonicalUrl(link: string): string | undefined {
  const safe = safeHttpUrl(decodeEntities(link.trim()));
  if (!safe) return undefined;
  const url = new URL(safe);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  const query = url.searchParams.toString();
  return `${url.protocol}//${url.host}${path === "/" && !query ? "" : path}${query ? `?${query}` : ""}`;
}

/** Key to detect the same headline across outlets' feeds: normalized, without a "- Outlet" suffix. */
export function titleKey(title: string, outlet?: string): string {
  const outletKey = outlet ? normalizeText(outlet) : "";
  const key = normalizeText(title);
  return outletKey && key.endsWith(` ${outletKey}`) ? key.slice(0, -(outletKey.length + 1)).trim() : key;
}

/** FNV-1a, 32 bit: a short stable id, not a security hash. */
export function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
