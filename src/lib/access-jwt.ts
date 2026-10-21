import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from "jose";

export const ACCESS_HEADER = "Cf-Access-Jwt-Assertion";
export const ACCESS_COOKIE = "CF_Authorization";

export interface VerifyOptions {
  /** Team domain, for example `miequipo.cloudflareaccess.com`. */
  teamDomain: string;
  /** AUD tag of the Access application. */
  audience: string;
  /** Injected key set for tests. Defaults to the remote certs of the team domain. */
  jwks?: JWTVerifyGetKey;
}

export type VerifyResult =
  | { ok: true; email: string | undefined; sub: string | undefined }
  | { ok: false; reason: "missing" | "expired" | "invalid" };

// One remote key set per team domain, kept at module level so the keys are cached across requests.
const remoteSets = new Map<string, JWTVerifyGetKey>();

function remoteJwks(teamDomain: string): JWTVerifyGetKey {
  let set = remoteSets.get(teamDomain);
  if (!set) {
    set = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    remoteSets.set(teamDomain, set);
  }
  return set;
}

/** Reads the Access token from the header, then from the `CF_Authorization` cookie. */
export function extractAccessToken(request: Request): string | undefined {
  const header = request.headers.get(ACCESS_HEADER)?.trim();
  if (header) return header;
  const cookie = request.headers.get("cookie");
  if (!cookie) return undefined;
  for (const part of cookie.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === ACCESS_COOKIE) {
      const value = part.slice(index + 1).trim();
      return value || undefined;
    }
  }
  return undefined;
}

/** Verifies an Access JWT (RS256, issuer, audience, 5 s clock tolerance). Never logs or returns the token. */
export async function verifyAccessJwt(token: string | undefined, options: VerifyOptions): Promise<VerifyResult> {
  if (!token) return { ok: false, reason: "missing" };
  try {
    const { payload } = await jwtVerify(token, options.jwks ?? remoteJwks(options.teamDomain), {
      issuer: `https://${options.teamDomain}`,
      audience: options.audience,
      algorithms: ["RS256"],
      clockTolerance: 5,
    });
    return {
      ok: true,
      email: typeof payload.email === "string" ? payload.email : undefined,
      sub: payload.sub,
    };
  } catch (error) {
    return { ok: false, reason: error instanceof errors.JWTExpired ? "expired" : "invalid" };
  }
}
