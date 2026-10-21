import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SourceErrorKind } from "@/features/entorno/source-failure";

/** One short hint per failure kind, shown under the message so the user knows what to expect. */
const KIND_HINTS: Partial<Record<SourceErrorKind, string>> = {
  rate_limited: "La fuente limitó las consultas. Espera un momento antes de reintentar.",
  network: "Revisa tu conexión o intenta de nuevo en unos minutos.",
  schema: "La fuente cambió su formato. Avisa al equipo si sigue pasando.",
};

interface Props {
  message: string;
  onRetry?: () => void;
  /** Name of the failing source, for example "SECOP II". */
  source?: string;
  /** Real kind of the failure (`error.kind` of a `SourceFailure`); unknown kinds add no hint. */
  kind?: SourceErrorKind;
}

export function ErrorState({ message, onRetry, source, kind }: Props) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{source ? `No pudimos consultar ${source}` : "No pudimos traer los datos"}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {kind && KIND_HINTS[kind] && <p>{KIND_HINTS[kind]}</p>}
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
