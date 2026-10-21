import { describe, expect, it } from "vitest";
import { DEFAULT_OPENAI_MODEL, DEFAULT_OPENROUTER_MODEL, resolveModel } from "./model";

describe("resolveModel", () => {
  it("defaults to OpenAI with the default model", () => {
    const result = resolveModel({ OPENAI_API_KEY: "sk-test" });
    expect(result).toMatchObject({ ok: true, provider: "openai", modelId: DEFAULT_OPENAI_MODEL });
  });

  it("honors AI_MODEL", () => {
    expect(resolveModel({ OPENAI_API_KEY: "sk-test", AI_MODEL: "gpt-5" })).toMatchObject({ ok: true, modelId: "gpt-5" });
  });

  it("fails with a Spanish message when the key is missing", () => {
    const result = resolveModel({});
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("falta la clave") });
  });

  it("supports OpenRouter as an alternative", () => {
    expect(resolveModel({ AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: "k" })).toMatchObject({
      ok: true,
      provider: "openrouter",
      modelId: DEFAULT_OPENROUTER_MODEL,
    });
    expect(resolveModel({ AI_PROVIDER: "openrouter" })).toMatchObject({ ok: false });
  });

  it("rejects an unknown provider and never echoes the key", () => {
    const result = resolveModel({ AI_PROVIDER: "other", OPENAI_API_KEY: "sk-secret" });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("sk-secret");
  });

  describe("fallback", () => {
    it("pairs OpenAI with an OpenRouter fallback when both keys exist", () => {
      const result = resolveModel({ OPENAI_API_KEY: "a", OPENROUTER_API_KEY: "b" });
      expect(result).toMatchObject({
        ok: true,
        provider: "openai",
        fallback: { provider: "openrouter", modelId: DEFAULT_OPENROUTER_MODEL },
      });
    });

    it("honors AI_FALLBACK_MODEL", () => {
      const result = resolveModel({ OPENAI_API_KEY: "a", OPENROUTER_API_KEY: "b", AI_FALLBACK_MODEL: "x/y" });
      expect(result).toMatchObject({ ok: true, fallback: { modelId: "x/y" } });
    });

    it("has no fallback when its key is missing", () => {
      const result = resolveModel({ OPENAI_API_KEY: "a" });
      expect(result).toMatchObject({ ok: true, provider: "openai" });
      expect(result).not.toHaveProperty("fallback");
    });

    it("has no fallback when AI_FALLBACK_PROVIDER is none", () => {
      const result = resolveModel({ OPENAI_API_KEY: "a", OPENROUTER_API_KEY: "b", AI_FALLBACK_PROVIDER: "none" });
      expect(result).toMatchObject({ ok: true, provider: "openai" });
      expect(result).not.toHaveProperty("fallback");
    });

    it("goes straight to the fallback when the primary key is missing", () => {
      const result = resolveModel({ OPENROUTER_API_KEY: "b" });
      expect(result).toMatchObject({ ok: true, provider: "openrouter", usingFallback: true });
      expect(result).not.toHaveProperty("fallback");
    });

    it("does not use the fallback when it is disabled and the primary key is missing", () => {
      expect(resolveModel({ OPENROUTER_API_KEY: "b", AI_FALLBACK_PROVIDER: "none" })).toMatchObject({ ok: false });
    });

    it("fails with the Spanish message when neither key exists", () => {
      expect(resolveModel({})).toMatchObject({ ok: false, message: expect.stringContaining("falta la clave") });
    });

    it("never echoes keys", () => {
      expect(JSON.stringify(resolveModel({ OPENAI_API_KEY: "sk-one", OPENROUTER_API_KEY: "sk-two" }))).not.toMatch(/sk-one|sk-two/);
    });
  });
});
