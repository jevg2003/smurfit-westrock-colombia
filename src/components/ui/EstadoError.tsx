import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Props {
  mensaje: string;
  onReintentar?: () => void;
}

export function EstadoError({ mensaje, onReintentar }: Props) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>No pudimos traer los datos</AlertTitle>
      <AlertDescription>
        <p>{mensaje}</p>
        {onReintentar && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onReintentar}>
            Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
