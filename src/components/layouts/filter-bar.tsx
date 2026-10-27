import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  /** True while at least one filter is applied. */
  active: boolean;
  onClear: () => void;
  /** The filters, always visible and named. */
  children?: ReactNode;
  /** Buttons that are not filters, for example the CSV export. */
  trailing?: ReactNode;
}

/** The fixed row of filters above a list. Limpiar resets every filter of the screen at once. */
export function FilterBar({ active, onClear, children, trailing }: Props) {
  return (
    <div role="group" aria-label="Filtros" className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">
      {children}
      <Button variant="ghost" size="sm" disabled={!active} onClick={onClear}>
        Limpiar
      </Button>
      {trailing && <div className="flex flex-wrap items-center gap-2 sm:ms-auto print:hidden">{trailing}</div>}
    </div>
  );
}
