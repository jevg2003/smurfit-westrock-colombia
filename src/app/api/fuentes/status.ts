import { readFlags, type SourceFlags } from "@/infrastructure/flags";
import { resolveModel, type ModelEnv } from "@/infrastructure/ai/model";

export interface FuentesStatus {
  flags: SourceFlags;
  ai: {
    /** True when a key exists for the selected provider. The key itself is never returned. */
    configured: boolean;
    provider: string;
    webSearch: boolean;
  };
}

/** Booleans and the provider name only: nothing here may carry a secret. */
export function buildFuentesStatus(env: ModelEnv): FuentesStatus {
  const resolution = resolveModel(env);
  const provider = (env.AI_PROVIDER?.trim() || "openai").toLowerCase();
  return {
    flags: readFlags(env),
    ai: {
      configured: resolution.ok,
      provider,
      webSearch: resolution.ok && resolution.webSearchTools !== undefined,
    },
  };
}
