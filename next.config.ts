import type { NextConfig } from "next";
import path from "node:path";

/** Origins the browser calls directly (client adapters). Everything else goes through our own `/api` routes. */
const BROWSER_CONNECT_ORIGINS = ["https://www.datos.gov.co", "https://api.worldbank.org"];

/**
 * Static CSP (no nonce): a nonce forces dynamic rendering and conflicts with PPR.
 * `'unsafe-inline'` is needed for the Next inline bootstrap scripts and the styles of the UI libraries.
 */
export function buildContentSecurityPolicy({ dev }: { dev: boolean }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "connect-src": ["'self'", ...BROWSER_CONNECT_ORIGINS, ...(dev ? ["ws:", "wss:"] : [])],
    "img-src": ["'self'", "data:", "blob:"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

const securityHeaders = [
  // Report-Only first: violations show in the console without blocking. Switch to
  // "Content-Security-Policy" once the post-deploy review shows no violations.
  { key: "Content-Security-Policy-Report-Only", value: buildContentSecurityPolicy({ dev: process.env.NODE_ENV !== "production" }) },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: path.resolve(__dirname) },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
