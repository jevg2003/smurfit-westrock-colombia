import type { SourceErrorKind } from "@/features/entorno/source-failure";
import { ErrorState } from "./error-state";
import { StaleNotice } from "./stale-notice";

export interface SourceNotice {
  /** Name as it reads after "consultar", for example "SECOP II" or "la TRM". */
  name: string;
  status: "pending" | "ready" | "error";
  errorMessage?: string;
  errorKind?: SourceErrorKind;
  retry?: () => void;
  isStale?: boolean;
  /** Epoch milliseconds of the last good answer. */
  updatedAt?: number;
}

/** Inline errors and stale-data lines for the sources a screen depends on. Renders nothing when all are fine. */
export function SourceNotices({ sources }: { sources: SourceNotice[] }) {
  const shown = sources.filter((source) => source.status === "error" || source.isStale);
  if (shown.length === 0) return null;

  return (
    <div className="flex shrink-0 flex-col gap-2">
      {shown.map((source) => (
        <div key={source.name}>
          {source.status === "error" && (
            <ErrorState
              source={source.name}
              message={source.errorMessage ?? "Error desconocido."}
              kind={source.errorKind}
              onRetry={source.retry}
              othersKeepWorking
            />
          )}
          {source.isStale && <StaleNotice source={source.name} updatedAt={source.updatedAt} />}
        </div>
      ))}
    </div>
  );
}
