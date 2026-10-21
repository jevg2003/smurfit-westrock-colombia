import { describe, expect, it } from "vitest";
import nextConfig, { buildContentSecurityPolicy } from "./next.config";

async function headersOf(path: string) {
  const rules = await nextConfig.headers!();
  const rule = rules.find((entry) => entry.source === path);
  expect(rule).toBeDefined();
  return Object.fromEntries(rule!.headers.map((header) => [header.key, header.value]));
}

describe("security headers", () => {
  it("sends a Report-Only CSP, not an enforcing one, for every route", async () => {
    const headers = await headersOf("/:path*");
    expect(headers["Content-Security-Policy-Report-Only"]).toBeTruthy();
    expect(headers["Content-Security-Policy"]).toBeUndefined();
  });

  it("restricts the CSP to our own origin plus the browser-called sources", () => {
    const csp = buildContentSecurityPolicy({ dev: false });
    const directives = Object.fromEntries(csp.split("; ").map((part) => [part.split(" ")[0], part]));
    expect(directives["default-src"]).toBe("default-src 'self'");
    expect(directives["connect-src"]).toBe("connect-src 'self' https://www.datos.gov.co https://api.worldbank.org");
    expect(directives["img-src"]).toBe("img-src 'self' data: blob:");
    expect(directives["style-src"]).toBe("style-src 'self' 'unsafe-inline'");
    expect(directives["script-src"]).toBe("script-src 'self' 'unsafe-inline'");
    expect(directives["frame-ancestors"]).toBe("frame-ancestors 'none'");
    expect(directives["base-uri"]).toBe("base-uri 'self'");
    expect(directives["form-action"]).toBe("form-action 'self'");
  });

  it("allows eval and websockets only in development", () => {
    expect(buildContentSecurityPolicy({ dev: false })).not.toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy({ dev: false })).not.toContain("ws:");
    const dev = buildContentSecurityPolicy({ dev: true });
    expect(dev).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(dev).toContain("ws:");
  });

  it("sends the hardening headers", async () => {
    const headers = await headersOf("/:path*");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Permissions-Policy"]).toBe("camera=(), microphone=(), geolocation=()");
  });
});
