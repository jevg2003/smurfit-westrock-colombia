import type { SourceId } from "@/core/domain/provenance";
import type { SourceError } from "@/core/domain/result";

export type SourceErrorKind = SourceError["kind"];

/**
 * An adapter failure that keeps its typed `kind` and HTTP `status`, so screens never have to
 * guess them from the Spanish message. `message` stays the same text the adapter wrote.
 */
export class SourceFailure extends Error {
  readonly kind: SourceErrorKind;
  readonly status: number | undefined;
  readonly sourceId: SourceId;

  constructor(error: SourceError) {
    super(error.message);
    this.name = "SourceFailure";
    this.kind = error.kind;
    this.status = error.status;
    this.sourceId = error.sourceId;
  }
}

/** The kind of a thrown value: the real one for a `SourceFailure`, "unknown" for anything else. */
export function errorKindOf(error: unknown): SourceErrorKind {
  return error instanceof SourceFailure ? error.kind : "unknown";
}
