import { describe, expect, it } from "vitest";
import { buildFuentesStatus } from "./status";

describe("buildFuentesStatus", () => {
  it("reports only booleans and the provider name, never a key", () => {
    const status = buildFuentesStatus({ OPENAI_API_KEY: "sk-secret-value", FEATURE_GOOGLE_NEWS: "false" });
    expect(status).toEqual({
      flags: { newsRss: true, googleNews: false, minambiente: true, presidencia: true },
      ai: { configured: true, provider: "openai", webSearch: true },
    });
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
});
