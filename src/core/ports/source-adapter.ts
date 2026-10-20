import type { Provenance, SourceId } from "../domain/provenance";
import type { Result } from "../domain/result";

export interface SourceAdapter<Q, T> {
  readonly sourceId: SourceId;
  fetch(query: Q, options: { signal?: AbortSignal; now: Date }): Promise<Result<{ data: T; provenance: Provenance }>>;
}
