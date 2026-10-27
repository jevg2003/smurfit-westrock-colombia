import { Fragment, type ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface Indicator {
  id: string;
  label: string;
  /** `null` shows "Sin dato" (or the loading shape when `loading`). */
  value: ReactNode | null;
  /** Variation, period or unit under the value. */
  note?: ReactNode;
  loading?: boolean;
}

interface Props {
  items: Indicator[];
  /** Makes the indicators selectable: the chart below follows the selected one. */
  selected?: string;
  onSelect?: (id: string) => void;
}

function Body({ item }: { item: Indicator }) {
  if (item.loading) return <Skeleton role="status" aria-label={`Consultando ${item.label}`} className="h-12 w-28" />;
  return (
    <span className="flex flex-col items-start gap-0.5 text-start">
      <span className="text-2xl leading-8 font-semibold tracking-tight tabular-nums">{item.value ?? <span className="text-base font-normal text-muted-foreground">Sin dato</span>}</span>
      <span className="text-sm text-muted-foreground">{item.label}</span>
      {item.note && <span className="text-xs text-muted-foreground">{item.note}</span>}
    </span>
  );
}

/**
 * Indicators as text with their variation, side by side and separated by thin lines, never in boxes.
 * On a phone the row scrolls horizontally and snaps to each indicator.
 */
export function IndicatorStrip({ items, selected, onSelect }: Props) {
  return (
    <div className="flex snap-x items-stretch gap-4 overflow-x-auto pb-1 sm:gap-6">
      {items.map((item, index) => (
        <Fragment key={item.id}>
          {index > 0 && <Separator orientation="vertical" />}
          {onSelect ? (
            <button
              type="button"
              aria-pressed={selected === item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "shrink-0 snap-start rounded-md px-2 py-1 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                selected === item.id && "bg-muted",
              )}
            >
              <Body item={item} />
            </button>
          ) : (
            <div className="shrink-0 snap-start px-2 py-1">
              <Body item={item} />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
