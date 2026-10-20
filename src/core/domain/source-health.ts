import type { SourceId } from "./provenance";
import type { SourceError } from "./result";

export interface SourceHealth {
  sourceId: SourceId;
  lastSuccessAt?: string;
  lastError?: SourceError;
  expectedEvery: "hourly" | "daily" | "yearly" | "manual";
}
