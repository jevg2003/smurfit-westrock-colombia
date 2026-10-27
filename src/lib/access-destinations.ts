/**
 * Private destinations of the Cloudflare Access application "SWC Monitor (privado)".
 *
 * Why a list instead of one rule for the whole host: Access gives the same weight to a whole-host
 * destination and to the root bypass, so protecting `swc.mecateo.co/*` also protects `/` and the
 * public landing never opens. Verified live on 2026-10-21. The private application therefore names
 * every private path, and the Bypass application opens `/`, `/_next/static/*`, `/landing/*` and
 * the site icons `/icon.svg`, `/favicon.ico`, `/apple-touch-icon.png` (see `PUBLIC_PATH_RULES` in `access-paths.ts`).
 *
 * A path that is in neither application is public at the Cloudflare edge, but the app's own proxy
 * (`proxy.ts`) still rejects it with 401, so the JWT check is the second barrier. A unit test keeps
 * this list in sync with the route folders. When a route is added, add it here AND in Cloudflare.
 */
export const ACCESS_HOST = "swc.mecateo.co";

/** Page routes of the `(app)` group (folder names under `src/app/(app)`). Each one is a prefix: `/resumen*`. */
const PAGE_ROUTES = ["resumen", "economia", "noticias", "analisis", "asistente", "configuracion"] as const;

/** Non-page endpoints that must stay private: the API and the Next.js endpoints that are not static assets. */
const OTHER_PRIVATE = ["api/*", "_next/image*", "_next/data/*", ".well-known/*"] as const;

export const PRIVATE_ACCESS_DESTINATIONS: readonly string[] = [
  ...PAGE_ROUTES.map((route) => `${ACCESS_HOST}/${route}*`),
  ...OTHER_PRIVATE.map((path) => `${ACCESS_HOST}/${path}`),
];

/** Names of the page routes covered by the list (used by the sync test). */
export function privateRouteNames(): string[] {
  return [...PAGE_ROUTES];
}
