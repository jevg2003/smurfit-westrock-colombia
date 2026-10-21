import type { SourceId } from "@/core/domain/provenance";
import type { SourceError } from "@/core/domain/result";

export type SourceErrorKind = SourceError["kind"];

/** Sources the browser reads through this app's own `/api/*` (behind Cloudflare Access). */
const SAME_ORIGIN_SOURCES: ReadonlySet<SourceId> = new Set(["news-rss", "google-news", "minambiente", "presidencia", "xm"]);

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
    // A 401/403 from our own API means the Access session expired; the same status from an external source does not.
    const expired = (error.status === 401 || error.status === 403) && SAME_ORIGIN_SOURCES.has(error.sourceId);
    this.kind = expired ? "unauthorized" : error.kind;
    this.status = error.status;
    this.sourceId = error.sourceId;
  }
}

/** The kind of a thrown value: the real one for a `SourceFailure`, "unknown" for anything else. */
export function errorKindOf(error: unknown): SourceErrorKind {
  return error instanceof SourceFailure ? error.kind : "unknown";
}
