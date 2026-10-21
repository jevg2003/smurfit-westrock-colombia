import type { SourceView } from "@/features/entorno/source-view";
import type { RegulationBlock } from "@/infrastructure/sources/regulation/client-adapter";
import type { FeedHealth } from "@/infrastructure/sources/rss/service";
import { classifyErrorKind, type ErrorKind } from "./source-state";

export type RowState = "ok" | "stale" | "error" | "empty" | "disabled" | "pending" | "unchecked";

/** Health of one source as the screen needs it, independent of where it came from. */
export interface Snapshot {
  state: RowState;
  /** Epoch milliseconds of the last successful answer. */
  lastSuccess?: number;
  error?: { kind: ErrorKind; message: string };
  /** Extra fact shown under the state, for example the AI provider. */
  detail?: string;
  retry?: () => void;
}

interface ViewFlags {
  /** The answer had no records. */
  empty?: boolean;
  /** The server flag switched the source off. */
  off?: boolean;
}

export function fromView(view: SourceView, { empty, off }: ViewFlags): Snapshot {
  const error = view.errorMessage ? { kind: classifyErrorKind(view.errorMessage), message: view.errorMessage } : undefined;
  const base = { ...(view.updatedAt !== undefined ? { lastSuccess: view.updatedAt } : {}), ...(error ? { error } : {}), retry: view.retry };
  if (view.status === "pending") return { state: "pending", retry: view.retry };
  if (view.status === "error") return { state: "error", ...base };
  if (off) return { state: "disabled", ...base };
  if (view.isStale) return { state: "stale", ...base };
  return { state: empty ? "empty" : "ok", ...base };
}

function fromStatus(status: "ok" | "error" | "disabled", count: number, message: string | undefined, lastSuccess: number | undefined, retry: () => void): Snapshot {
  const at = lastSuccess === undefined ? {} : { lastSuccess };
  if (status === "disabled") return { state: "disabled", ...at, retry };
  if (status === "error") {
    const text = message ?? "La fuente no respondió.";
    return { state: "error", error: { kind: classifyErrorKind(text), message: text }, retry };
  }
  return { state: count === 0 ? "empty" : "ok", ...at, retry };
}

export function fromFeed(feed: FeedHealth, lastSuccess: number | undefined, retry: () => void): Snapshot {
  return fromStatus(feed.status, feed.count, feed.message, lastSuccess, retry);
}

export function fromBlock(block: RegulationBlock, lastSuccess: number | undefined, retry: () => void): Snapshot {
  return fromStatus(block.status, block.items.length, block.message, lastSuccess, retry);
}

/** The server flag wins: a source switched off is "disabled" whatever the cache says. */
export function withFlag(snapshot: Snapshot, flagOn: boolean | undefined): Snapshot {
  return flagOn === false ? { ...snapshot, state: "disabled" } : snapshot;
}
