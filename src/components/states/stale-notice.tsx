import { Badge } from "@/components/reui/badge";
import { formatHoraBogota } from "@/lib/date";

interface Props {
  source: string;
  /** Epoch milliseconds of the last good answer. */
  updatedAt?: number;
}

/** Shown when a refresh failed and the screen keeps the previous answer. */
export function StaleNotice({ source, updatedAt }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="warning-light" size="sm">
        Dato desactualizado
      </Badge>
      <span>
        No pudimos actualizar {source}.
        {updatedAt ? ` Último dato: ${formatHoraBogota(new Date(updatedAt).toISOString())}.` : ""}
      </span>
    </div>
  );
}
