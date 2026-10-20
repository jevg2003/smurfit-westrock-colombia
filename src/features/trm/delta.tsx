import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Percentage change; `null` when there is no previous day to compare against. */
  value: number | null;
  /** Spoken suffix for screen readers, e.g. "frente al día anterior". */
  against: string;
  className?: string;
}

/** Signed percentage change. Up is blue, down is red, always paired with an arrow and spoken text. */
export function Delta({ value, against, className }: Props) {
  if (value === null) {
    return <span className={cn("font-mono text-sm text-muted-foreground", className)}>n/d</span>;
  }

  const sube = value > 0;
  const baja = value < 0;

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 font-mono text-sm font-medium tabular-nums",
        sube && "text-info-foreground",
        baja && "text-destructive-foreground",
        !sube && !baja && "text-muted-foreground",
        className,
      )}
    >
      {sube && <ArrowUpIcon aria-hidden="true" className="size-3.5" />}
      {baja && <ArrowDownIcon aria-hidden="true" className="size-3.5" />}
      {Math.abs(value).toFixed(2)}%
      <span className="sr-only">
        {sube ? "sube" : baja ? "baja" : "sin cambio"} {against}
      </span>
    </span>
  );
}
