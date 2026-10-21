import type { JWTVerifyGetKey } from "jose";
import { extractAccessToken, verifyAccessJwt } from "./access-jwt";
import { isPublicPath } from "./access-paths";

/** Header carrying the verified email to server code. Always stripped from incoming requests. */
export const ACCESS_EMAIL_HEADER = "x-access-email";

export interface AccessEnv {
  CF_ACCESS_TEAM_DOMAIN?: string | undefined;
  CF_ACCESS_AUD?: string | undefined;
  /** `off` is the emergency switch: access checks are skipped. Any other value enforces. */
  CF_ACCESS_ENFORCE?: string | undefined;
  NODE_ENV?: string | undefined;
}

export type AccessOutcome =
  /** `headers` are the request headers to forward, with any forged `x-access-email` removed. */
  | { type: "pass"; headers: Headers }
  | { type: "deny"; response: Response };

const UNAUTHORIZED_TEXT = "Acceso no autorizado. Entra desde https://swc.mecateo.co";
const NOT_CONFIGURED_TEXT = "Acceso no configurado: faltan CF_ACCESS_TEAM_DOMAIN y CF_ACCESS_AUD";

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function deny(pathname: string, status: 401 | 503, text: string, jsonError: string): AccessOutcome {
  const headers = { "Cache-Control": "no-store" };
  const response = pathname.startsWith("/api/")
    ? Response.json({ error: jsonError }, { status, headers })
    : new Response(text, { status, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
  return { type: "deny", response };
}

/** True when access checks apply to this deployment: configured, or production without configuration. */
export function isAccessConfigured(env: AccessEnv): boolean {
  return clean(env.CF_ACCESS_TEAM_DOMAIN) !== undefined && clean(env.CF_ACCESS_AUD) !== undefined && !isSwitchedOff(env);
}

function isSwitchedOff(env: AccessEnv): boolean {
  return clean(env.CF_ACCESS_ENFORCE)?.toLowerCase() === "off";
}

/**
 * Decides whether a request may reach the app. Order: public path, emergency switch,
 * JWT check, and fail closed in production when the configuration is missing.
 */
export async function handleAccess(request: Request, env: AccessEnv, jwks?: JWTVerifyGetKey): Promise<AccessOutcome> {
  const headers = new Headers(request.headers);
  // A client must never choose its own identity.
  headers.delete(ACCESS_EMAIL_HEADER);

  const { pathname } = new URL(request.url);
  if (isPublicPath(pathname)) return { type: "pass", headers };
  if (isSwitchedOff(env)) return { type: "pass", headers };

  const teamDomain = clean(env.CF_ACCESS_TEAM_DOMAIN);
  const audience = clean(env.CF_ACCESS_AUD);
  if (!teamDomain || !audience) {
    if (env.NODE_ENV === "development" || env.NODE_ENV === "test") return { type: "pass", headers };
    return deny(pathname, 503, NOT_CONFIGURED_TEXT, "access_not_configured");
  }

  const result = await verifyAccessJwt(extractAccessToken(request), { teamDomain, audience, ...(jwks ? { jwks } : {}) });
  if (!result.ok) return deny(pathname, 401, UNAUTHORIZED_TEXT, "unauthorized");
  if (result.email) headers.set(ACCESS_EMAIL_HEADER, result.email);
  return { type: "pass", headers };
}
