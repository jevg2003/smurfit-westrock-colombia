import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { handleAccess, type AccessEnv } from "./access-handler";

const TEAM = "miequipo.cloudflareaccess.com";
const AUD = "aud-1";
const configured: AccessEnv = { CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD, NODE_ENV: "production" };
const unconfiguredProd: AccessEnv = { NODE_ENV: "production" };

let jwks: JWTVerifyGetKey;
let token: string;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), kid: "k", alg: "RS256" }] });
  token = await new SignJWT({ email: "ana@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "k" })
    .setSubject("u1")
    .setIssuer(`https://${TEAM}`)
    .setAudience(AUD)
    .setExpirationTime("1h")
    .sign(pair.privateKey);
});

const req = (path: string, headers: Record<string, string> = {}) => new Request(`https://swc.mecateo.co${path}`, { headers });

describe("handleAccess: public paths", () => {
  it.each(["/", "/_next/static/a.js", "/landing/a.webp", "/favicon.svg"])("passes %s without any token or config", async (path) => {
    const result = await handleAccess(req(path), unconfiguredProd, jwks);
    expect(result.type).toBe("pass");
  });

  it("strips a forged x-access-email header even on public paths", async () => {
    const result = await handleAccess(req("/", { "x-access-email": "root@evil.com" }), configured, jwks);
    expect(result.type === "pass" && result.headers.get("x-access-email")).toBeNull();
  });
});

describe("handleAccess: emergency switch", () => {
  it("passes everything when CF_ACCESS_ENFORCE is off", async () => {
    const result = await handleAccess(req("/api/chat"), { ...unconfiguredProd, CF_ACCESS_ENFORCE: "off" }, jwks);
    expect(result.type).toBe("pass");
  });

  it("still strips the forged header when off", async () => {
    const result = await handleAccess(req("/home", { "x-access-email": "root@evil.com" }), { CF_ACCESS_ENFORCE: "off" }, jwks);
    expect(result.type === "pass" && result.headers.get("x-access-email")).toBeNull();
  });

  it("is not disabled by other values", async () => {
    const result = await handleAccess(req("/home"), { ...configured, CF_ACCESS_ENFORCE: "false" }, jwks);
    expect(result.type).toBe("deny");
  });
});

describe("handleAccess: configured", () => {
  it("passes a valid header token and sets x-access-email", async () => {
    const result = await handleAccess(req("/home", { "Cf-Access-Jwt-Assertion": token }), configured, jwks);
    expect(result.type).toBe("pass");
    expect(result.type === "pass" && result.headers.get("x-access-email")).toBe("ana@example.com");
  });

  it("passes a valid cookie token", async () => {
    const result = await handleAccess(req("/api/news", { cookie: `CF_Authorization=${token}` }), configured, jwks);
    expect(result.type).toBe("pass");
  });

  it("overwrites a forged x-access-email with the verified one", async () => {
    const result = await handleAccess(
      req("/home", { "Cf-Access-Jwt-Assertion": token, "x-access-email": "root@evil.com" }),
      configured,
      jwks,
    );
    expect(result.type === "pass" && result.headers.get("x-access-email")).toBe("ana@example.com");
  });

  it("answers an API call without a token with a 401 JSON", async () => {
    const result = await handleAccess(req("/api/chat"), configured, jwks);
    expect(result.type).toBe("deny");
    if (result.type !== "deny") return;
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("content-type")).toContain("application/json");
    expect(await result.response.json()).toEqual({ error: "unauthorized" });
  });

  it("answers a page with an invalid token with a plain 401 in Spanish", async () => {
    const result = await handleAccess(req("/home", { "Cf-Access-Jwt-Assertion": "garbage" }), configured, jwks);
    expect(result.type).toBe("deny");
    if (result.type !== "deny") return;
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("content-type")).toContain("text/plain");
    expect(await result.response.text()).toBe("Acceso no autorizado. Entra desde https://swc.mecateo.co");
    expect(result.response.headers.get("location")).toBeNull();
  });

  it("denies a path that tries to traverse out of /landing/", async () => {
    const result = await handleAccess(req("/landing/%2e%2e/api/chat"), configured, jwks);
    expect(result.type).toBe("deny");
  });

  it("needs both variables to be configured", async () => {
    const result = await handleAccess(req("/home"), { CF_ACCESS_TEAM_DOMAIN: TEAM, NODE_ENV: "production" }, jwks);
    expect(result.type === "deny" && result.response.status).toBe(503);
  });
});

describe("handleAccess: not configured", () => {
  it.each(["development", "test"])("passes in %s", async (NODE_ENV) => {
    const result = await handleAccess(req("/home"), { NODE_ENV }, jwks);
    expect(result.type).toBe("pass");
  });

  it("fails closed with a 503 in production", async () => {
    const result = await handleAccess(req("/home"), unconfiguredProd, jwks);
    expect(result.type).toBe("deny");
    if (result.type !== "deny") return;
    expect(result.response.status).toBe(503);
    expect(await result.response.text()).toBe("Acceso no configurado: faltan CF_ACCESS_TEAM_DOMAIN y CF_ACCESS_AUD");
  });

  it("fails closed with a JSON 503 for the API", async () => {
    const result = await handleAccess(req("/api/chat"), unconfiguredProd, jwks);
    expect(result.type === "deny" && result.response.status).toBe(503);
  });

  it("treats a missing NODE_ENV as production", async () => {
    const result = await handleAccess(req("/home"), {}, jwks);
    expect(result.type === "deny" && result.response.status).toBe(503);
  });

  it("treats blank values as not set", async () => {
    const result = await handleAccess(req("/home"), { ...unconfiguredProd, CF_ACCESS_TEAM_DOMAIN: "  ", CF_ACCESS_AUD: "" }, jwks);
    expect(result.type === "deny" && result.response.status).toBe(503);
  });
});
