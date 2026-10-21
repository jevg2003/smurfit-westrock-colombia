import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWK, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { ACCESS_HEADER, extractAccessToken, verifyAccessJwt } from "./access-jwt";

const TEAM = "miequipo.cloudflareaccess.com";
const AUD = "aud-tag-123";

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let jwks: JWTVerifyGetKey;

async function sign(
  overrides: { aud?: string; iss?: string; exp?: string | number; key?: CryptoKey; email?: string | null } = {},
) {
  const email = overrides.email === undefined ? "ana@example.com" : overrides.email;
  const builder = new SignJWT(email === null ? {} : { email })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setSubject("user-1")
    .setIssuer(overrides.iss ?? `https://${TEAM}`)
    .setAudience(overrides.aud ?? AUD)
    .setIssuedAt()
    .setExpirationTime(overrides.exp ?? "1h");
  return builder.sign(overrides.key ?? privateKey);
}

const opts = () => ({ teamDomain: TEAM, audience: AUD, jwks });

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  const other = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  otherPrivateKey = other.privateKey;
  const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  jwks = createLocalJWKSet({ keys: [jwk] });
});

describe("verifyAccessJwt", () => {
  it("accepts a valid token", async () => {
    const result = await verifyAccessJwt(await sign(), opts());
    expect(result).toEqual({ ok: true, email: "ana@example.com", sub: "user-1" });
  });

  it("accepts a valid token without an email claim", async () => {
    const result = await verifyAccessJwt(await sign({ email: null }), opts());
    expect(result).toEqual({ ok: true, email: undefined, sub: "user-1" });
  });

  it("rejects a wrong audience", async () => {
    expect(await verifyAccessJwt(await sign({ aud: "other" }), opts())).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a wrong issuer", async () => {
    expect(await verifyAccessJwt(await sign({ iss: "https://evil.example.com" }), opts())).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects an expired token", async () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    expect(await verifyAccessJwt(await sign({ exp: past }), opts())).toEqual({ ok: false, reason: "expired" });
  });

  it("tolerates up to 5 seconds of clock skew", async () => {
    const recent = Math.floor(Date.now() / 1000) - 2;
    expect((await verifyAccessJwt(await sign({ exp: recent }), opts())).ok).toBe(true);
  });

  it("rejects a signature made by another key", async () => {
    expect(await verifyAccessJwt(await sign({ key: otherPrivateKey }), opts())).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects an unsigned (alg none) token", async () => {
    const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const token = `${b64({ alg: "none", typ: "JWT" })}.${b64({ iss: `https://${TEAM}`, aud: AUD, sub: "x", email: "a@b.c", exp: now + 3600 })}.`;
    expect(await verifyAccessJwt(token, opts())).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a malformed token", async () => {
    expect(await verifyAccessJwt("not-a-jwt", opts())).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyAccessJwt("a.b.c", opts())).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a missing token", async () => {
    expect(await verifyAccessJwt(undefined, opts())).toEqual({ ok: false, reason: "missing" });
    expect(await verifyAccessJwt("", opts())).toEqual({ ok: false, reason: "missing" });
  });

  it("never echoes the token in the result", async () => {
    const token = await sign({ aud: "other" });
    expect(JSON.stringify(await verifyAccessJwt(token, opts()))).not.toContain(token);
  });
});

describe("extractAccessToken", () => {
  it("prefers the Cf-Access-Jwt-Assertion header", () => {
    const request = new Request("https://x.test/", { headers: { [ACCESS_HEADER]: "from-header", cookie: "CF_Authorization=from-cookie" } });
    expect(extractAccessToken(request)).toBe("from-header");
  });

  it("falls back to the CF_Authorization cookie", () => {
    const request = new Request("https://x.test/", { headers: { cookie: "a=1; CF_Authorization=from-cookie; b=2" } });
    expect(extractAccessToken(request)).toBe("from-cookie");
  });

  it("returns undefined when neither exists", () => {
    expect(extractAccessToken(new Request("https://x.test/", { headers: { cookie: "a=1" } }))).toBeUndefined();
  });
});
