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
});
