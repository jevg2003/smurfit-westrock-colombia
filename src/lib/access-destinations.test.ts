import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isPublicPath } from "./access-paths";
import { ACCESS_HOST, PRIVATE_ACCESS_DESTINATIONS, privateRouteNames } from "./access-destinations";

const ROUTE_GROUPS = ["(app)", "(account)"] as const;

/** Route folders of the `(app)` and `(account)` groups: every one of them is a private page. */
function appRouteFolders(): string[] {
  return ROUTE_GROUPS.flatMap((group) => {
    const dir = join(process.cwd(), "src", "app", group);
    return readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory());
  });
}

describe("Cloudflare Access private destinations", () => {
  it("lists every page folder of the (app) and (account) groups, so a new route cannot be left public at the edge", () => {
    const declared = new Set(privateRouteNames());
    const missing = appRouteFolders().filter((name) => !declared.has(name));
    expect(missing, `add these routes to PRIVATE_ACCESS_DESTINATIONS and to the Cloudflare app: ${missing.join(", ")}`).toEqual([]);
  });

  it("does not list routes that no longer exist", () => {
    const folders = new Set(appRouteFolders());
    const stale = privateRouteNames().filter((name) => !folders.has(name));
    expect(stale).toEqual([]);
  });

  it("never overlaps the public contract: no destination can match a public path", () => {
    for (const destination of PRIVATE_ACCESS_DESTINATIONS) {
      const path = destination.slice(ACCESS_HOST.length).replace(/\*$/, "");
      expect(isPublicPath(path), destination).toBe(false);
      expect(isPublicPath(`${path}x`), destination).toBe(false);
    }
  });

  it("protects the API and the Next.js endpoints that are not static assets", () => {
    expect(PRIVATE_ACCESS_DESTINATIONS).toEqual(
      expect.arrayContaining([
        `${ACCESS_HOST}/api/*`,
        `${ACCESS_HOST}/_next/image*`,
        `${ACCESS_HOST}/_next/data/*`,
      ]),
    );
  });

  it("uses only the host and a path, with at most a trailing wildcard", () => {
    for (const destination of PRIVATE_ACCESS_DESTINATIONS) {
      expect(destination.startsWith(`${ACCESS_HOST}/`)).toBe(true);
      expect(destination.slice(0, -1)).not.toContain("*");
    }
  });
});
