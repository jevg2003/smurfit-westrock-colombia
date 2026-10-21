import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Props {
  message: string;
  onRetry?: () => void;
  /** Name of the failing source, for example "SECOP II". */
  source?: string;
}

export function ErrorState({ message, onRetry, source }: Props) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{source ? `No pudimos consultar ${source}` : "No pudimos traer los datos"}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
