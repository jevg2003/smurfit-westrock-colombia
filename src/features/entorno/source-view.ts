export interface SourceView {
  /** `pending` until the first answer; `error` when there is no data at all. */
  status: "pending" | "error" | "ready";
  errorMessage?: string;
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
    ...(query.isError ? { errorMessage: message } : {}),
    isStale: query.isError && hasData,
    ...(hasData ? { updatedAt: query.dataUpdatedAt } : {}),
    retry: () => void query.refetch(),
  };
}
