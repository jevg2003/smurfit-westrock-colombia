export type ErrorKind = "network" | "rate_limited" | "schema" | "empty" | "disabled";

export const ERROR_KIND_LABELS: Record<ErrorKind, string> = {
  network: "Red",
  rate_limited: "Límite de consultas",
  schema: "Formato",
  empty: "Sin datos",
  disabled: "Desactivada",
};

/**
 * The hooks keep only the error message, not its kind, so the kind is recovered from the
 * Spanish text the adapters write. Anything unrecognized counts as a network failure.
 */
export function classifyErrorKind(message: string | undefined): ErrorKind {
  const text = (message ?? "").toLowerCase();
  if (/desactivad/.test(text)) return "disabled";
  if (/limit[óo]|límite|429/.test(text)) return "rate_limited";
  if (/cambi[óo] de forma|no es json|formato|esquema/.test(text)) return "schema";
  if (/no devolvi[óo]|sin datos|no trajo/.test(text)) return "empty";
  return "network";
}
