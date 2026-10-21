import { describe, expect, it } from "vitest";
import { buildFuentesStatus } from "./status";

describe("buildFuentesStatus", () => {
  it("reports only booleans and the provider name, never a key", () => {
    const status = buildFuentesStatus({ OPENAI_API_KEY: "sk-secret-value", FEATURE_GOOGLE_NEWS: "false" });
    expect(status.flags).toMatchObject({ newsRss: true, googleNews: false, minambiente: true, presidencia: true });
    expect(Object.values(status.flags).every((value) => typeof value === "boolean")).toBe(true);
    expect(status.ai).toEqual({ configured: true, provider: "openai", webSearch: true });
    expect(JSON.stringify(status)).not.toContain("sk-secret-value");
  });

  it("reports the assistant as not configured without a key", () => {
    expect(buildFuentesStatus({}).ai).toEqual({ configured: false, provider: "openai", webSearch: false });
  });

  it("uses the openrouter key when that provider is selected, without web search", () => {
    const status = buildFuentesStatus({ AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: "or-key", OPENAI_API_KEY: "" });
    expect(status.ai).toEqual({ configured: true, provider: "openrouter", webSearch: false });
  });

  it("treats an unknown provider as not configured", () => {
    expect(buildFuentesStatus({ AI_PROVIDER: "foo", OPENAI_API_KEY: "x" }).ai.configured).toBe(false);
  });

  it("reports whether Cloudflare Access is enforced, as a boolean only", () => {
    const env = { CF_ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com", CF_ACCESS_AUD: "aud-secret-tag" };
    expect(buildFuentesStatus(env).access).toEqual({ enforced: true });
    expect(JSON.stringify(buildFuentesStatus(env))).not.toContain("aud-secret-tag");
    expect(JSON.stringify(buildFuentesStatus(env))).not.toContain("team.cloudflareaccess.com");
  });

  it("reports Access as not enforced when it is not configured or switched off", () => {
    expect(buildFuentesStatus({}).access).toEqual({ enforced: false });
    expect(buildFuentesStatus({ CF_ACCESS_TEAM_DOMAIN: "t", CF_ACCESS_AUD: "a", CF_ACCESS_ENFORCE: "off" }).access).toEqual({ enforced: false });
  });
});
