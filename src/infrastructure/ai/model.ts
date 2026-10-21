import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel, ToolSet } from "ai";

export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4.1-mini";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export type ModelEnv = Record<string, string | undefined>;
export type AiProvider = "openai" | "openrouter";

export interface ModelCandidate {
  model: LanguageModel;
  provider: AiProvider;
  modelId: string;
  /** Built-in web search tools. Only OpenAI has them. */
  webSearchTools?: ToolSet;
}

export type ModelResolution =
  | (ModelCandidate & {
      ok: true;
      /** Tried when the primary fails for a reason that means the provider is unavailable. */
      fallback?: ModelCandidate;
      /** True when the primary key is missing and the fallback answers from the start. */
      usingFallback?: boolean;
    })
  | { ok: false; message: string };

const MISSING_KEY = "El asistente no está configurado: falta la clave del proveedor de IA en el servidor.";
const UNKNOWN_PROVIDER = "El asistente no está configurado: el proveedor de IA indicado no existe.";

const isProvider = (name: string): name is AiProvider => name === "openai" || name === "openrouter";

/** Builds a provider's model, or `undefined` when its key is missing. Keys stay inside this module. */
function build(provider: AiProvider, env: ModelEnv, modelOverride: string | undefined): ModelCandidate | undefined {
  if (provider === "openai") {
    const apiKey = env.OPENAI_API_KEY?.trim();
    if (!apiKey) return undefined;
    const modelId = modelOverride || DEFAULT_OPENAI_MODEL;
    const openai = createOpenAI({ apiKey });
    return {
      provider,
      modelId,
      model: openai(modelId),
      // Built-in web search of the OpenAI Responses API. Results arrive as cited sources.
      webSearchTools: { web_search: openai.tools.webSearch({ searchContextSize: "low", userLocation: { type: "approximate", country: "CO" } }) },
    };
  }
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return undefined;
  const modelId = modelOverride || DEFAULT_OPENROUTER_MODEL;
  return { provider, modelId, model: createOpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL }).chat(modelId) };
}

/**
 * Picks the chat models from server env vars only.
 * Primary: `AI_PROVIDER` (default "openai") with `AI_MODEL`. Fallback: `AI_FALLBACK_PROVIDER`
 * (default "openrouter", "none" turns it off) with `AI_FALLBACK_MODEL`. A provider counts only if its key is set.
 */
export function resolveModel(env: ModelEnv): ModelResolution {
  const primaryName = (env.AI_PROVIDER?.trim() || "openai").toLowerCase();
  if (!isProvider(primaryName)) return { ok: false, message: UNKNOWN_PROVIDER };

  const fallbackName = (env.AI_FALLBACK_PROVIDER?.trim() || "openrouter").toLowerCase();
  const fallback =
    isProvider(fallbackName) && fallbackName !== primaryName ? build(fallbackName, env, env.AI_FALLBACK_MODEL?.trim()) : undefined;

  const primary = build(primaryName, env, env.AI_MODEL?.trim());
  if (primary) return { ok: true, ...primary, ...(fallback ? { fallback } : {}) };
  if (fallback) return { ok: true, ...fallback, usingFallback: true };
  return { ok: false, message: MISSING_KEY };
}
