import { errorKindOf, type SourceErrorKind } from "./source-failure";

export interface SourceView {
  /** `pending` until the first answer; `error` when there is no data at all. */
  status: "pending" | "error" | "ready";
  errorMessage?: string;
  /** Real kind of the failure; "unknown" for errors that are not a `SourceFailure`. */
  errorKind?: SourceErrorKind;
  /** True when a refresh failed and the data on screen is the previous answer. */
  isStale: boolean;
  /** Epoch milliseconds of the last successful answer. */
  updatedAt?: number;
  retry(): void;
}

interface QueryLike {
  isError: boolean;
  error: unknown;
  data: unknown;
  dataUpdatedAt: number;
  refetch(): unknown;
}

export function toSourceView(query: QueryLike): SourceView {
  const hasData = query.data !== undefined;
  const message = query.error instanceof Error ? query.error.message : "Error desconocido.";
  return {
    status: hasData ? "ready" : query.isError ? "error" : "pending",
    ...(query.isError ? { errorMessage: message, errorKind: errorKindOf(query.error) } : {}),
    isStale: query.isError && hasData,
    ...(hasData ? { updatedAt: query.dataUpdatedAt } : {}),
    retry: () => void query.refetch(),
  };
}
