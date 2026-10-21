import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4.1-mini";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export type ModelEnv = Record<string, string | undefined>;

export type ModelResolution =
  | { ok: true; model: LanguageModel; provider: "openai" | "openrouter"; modelId: string }
  | { ok: false; message: string };

/**
 * Picks the chat model from server env vars only. Keys are read here and never leave the server.
 * `AI_PROVIDER` is "openai" (default) or "openrouter"; `AI_MODEL` overrides the default model id.
 */
export function resolveModel(env: ModelEnv): ModelResolution {
  const provider = (env.AI_PROVIDER?.trim() || "openai").toLowerCase();
  const override = env.AI_MODEL?.trim();

  if (provider === "openai") {
    const apiKey = env.OPENAI_API_KEY?.trim();
    if (!apiKey) return { ok: false, message: "El asistente no está configurado: falta la clave del proveedor de IA en el servidor." };
    const modelId = override || DEFAULT_OPENAI_MODEL;
    return { ok: true, provider: "openai", modelId, model: createOpenAI({ apiKey })(modelId) };
  }

  if (provider === "openrouter") {
    const apiKey = env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) return { ok: false, message: "El asistente no está configurado: falta la clave del proveedor de IA en el servidor." };
    const modelId = override || DEFAULT_OPENROUTER_MODEL;
    return { ok: true, provider: "openrouter", modelId, model: createOpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL }).chat(modelId) };
  }

  return { ok: false, message: "El asistente no está configurado: el proveedor de IA indicado no existe." };
}
