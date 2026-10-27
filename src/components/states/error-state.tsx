import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SourceErrorKind } from "@/features/entorno/source-failure";
import { SESSION_EXPIRED_ACTION, SESSION_EXPIRED_MESSAGE, reenterSession } from "./session-expired";

/** One short hint per failure kind, shown under the message so the user knows what to expect. */
const KIND_HINTS: Partial<Record<SourceErrorKind, string>> = {
  rate_limited: "La fuente limitó las consultas. Espere un momento antes de reintentar.",
  network: "Revise su conexión o intente de nuevo en unos minutos.",
  schema: "La fuente cambió su formato. Avise al equipo si sigue pasando.",
};

interface Props {
  message: string;
  onRetry?: () => void;
  /** Name of the failing source, for example "SECOP II". */
  source?: string;
  /** Real kind of the failure (`error.kind` of a `SourceFailure`); unknown kinds add no hint. */
  kind?: SourceErrorKind;
  /** Adds that the rest of the screen still has its data. */
  othersKeepWorking?: boolean;
}

export function ErrorState({ message, onRetry, source, kind, othersKeepWorking }: Props) {
  if (kind === "unauthorized") {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>{source ? `No pudimos consultar ${source}` : "No pudimos traer los datos"}</AlertTitle>
        <AlertDescription>
          <p>{SESSION_EXPIRED_MESSAGE}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={reenterSession}>
            {SESSION_EXPIRED_ACTION}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{source ? `No pudimos consultar ${source}` : "No pudimos traer los datos"}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {kind && KIND_HINTS[kind] && <p>{KIND_HINTS[kind]}</p>}
        {othersKeepWorking && <p>Los demás datos siguen disponibles.</p>}
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
