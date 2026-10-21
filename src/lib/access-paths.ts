/**
 * Public path contract of the app. Everything not listed here (pages and `/api/*` included)
 * is private and needs a valid Cloudflare Access session. Keep `docs/cloudflare-access.md`
 * and the Cloudflare Bypass rules in sync with this list.
 */
export type PublicPathRule =
  | { kind: "exact"; path: string; description: string }
  | { kind: "prefix"; path: string; description: string };

export const PUBLIC_PATH_RULES: readonly PublicPathRule[] = [
  { kind: "exact", path: "/", description: "Public landing page." },
  { kind: "prefix", path: "/_next/static/", description: "Hashed build assets (JS, CSS, fonts) used by the landing." },
  { kind: "prefix", path: "/landing/", description: "Static images and media of the landing page." },
  { kind: "exact", path: "/icon.svg", description: "Site icon (SVG)." },
  { kind: "exact", path: "/favicon.ico", description: "Site icon for browsers that ask for the .ico file." },
  { kind: "exact", path: "/apple-touch-icon.png", description: "Icon for iOS home screens." },
];

/**
 * Characters that never appear in a legitimate public path. Anything outside this set (percent
 * escapes, dots-only segments, backslashes, control chars, spaces) makes the path private.
 * Matching is case sensitive on purpose: `/Landing/` is not `/landing/`.
 */
const SAFE_PATH = /^\/[A-Za-z0-9_\-./]*$/;

/** Pure and strict: returns true only for a canonical path that matches a public rule. */
export function isPublicPath(pathname: string): boolean {
  if (!SAFE_PATH.test(pathname)) return false;
  if (pathname.includes("//")) return false;
  const segments = pathname.split("/").slice(1);
  for (const segment of segments) {
    // "." and ".." segments, and segments ending in a dot ("a.", "..."), are traversal or trailing-dot tricks.
    if (segment === "." || segment === ".." || (segment.endsWith(".") && segment !== "")) return false;
  }
  return PUBLIC_PATH_RULES.some((rule) =>
    rule.kind === "exact" ? pathname === rule.path : pathname.startsWith(rule.path) && pathname.length > rule.path.length,
  );
}
