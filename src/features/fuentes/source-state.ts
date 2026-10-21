import type { SourceErrorKind } from "@/features/entorno/source-failure";

export type ErrorKind = SourceErrorKind;

export const ERROR_KIND_LABELS: Record<ErrorKind, string> = {
  network: "Red",
  rate_limited: "Límite de consultas",
  schema: "Formato",
  empty: "Sin datos",
  disabled: "Desactivada",
  unknown: "Desconocido",
};

/**
 * Kind of a failure that only carries an HTTP status (the server-side feed and regulation
 * answers). No status means we cannot tell, so it is "unknown" rather than a guess.
 */
export function kindFromHttpStatus(status: number | undefined): ErrorKind {
  if (status === undefined) return "unknown";
  if (status === 429) return "rate_limited";
  return status >= 400 ? "network" : "unknown";
}
