import type { SourceId } from "./provenance";

export interface SourceError {
  sourceId: SourceId;
  kind: "network" | "rate_limited" | "unauthorized" | "schema" | "empty" | "disabled" | "unknown";
  status?: number;
  message: string;
}

export type Result<T, E = SourceError> = { ok: true; value: T } | { ok: false; error: E };
