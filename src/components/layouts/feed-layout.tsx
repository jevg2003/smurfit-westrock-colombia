import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Fixed above the list. Usually a `FilterBar`. */
  filters?: ReactNode;
  /** Messages about the sources (errors, stale data). Fixed too. */
  notices?: ReactNode;
  /** Context only: counts that also filter. Right column on a desktop, a row above the list otherwise. */
  aside?: ReactNode;
  asideLabel?: string;
  /** The list. It scrolls inside its own region on a desktop. */
  children: ReactNode;
}

/**
 * L1. Feed of events with fixed filters. On a desktop (lg) the page does not scroll: the list and the
 * aside each scroll in their own column. Below that everything flows in one column and the page scrolls.
 */
export function FeedLayout({ filters, notices, aside, asideLabel = "Resumen", children }: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      {filters}
      {notices}
      <div className={cn("grid min-h-0 flex-1 gap-4", aside && "lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]")}>
        <section aria-label="Lista de eventos" className="min-h-0 min-w-0 lg:overflow-y-auto">
          {children}
        </section>
        {aside && (
          <aside aria-label={asideLabel} className="order-first min-h-0 min-w-0 lg:order-none lg:overflow-y-auto lg:border-s lg:ps-4 print:hidden">
            {aside}
          </aside>
        )}
      </div>
    </div>
  );
}
