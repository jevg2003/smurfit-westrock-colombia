import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SummaryOption {
  value: string;
  label: string;
  count: number;
  /** Same icon the rows use for this value; omit for free-text groups. */
  icon?: LucideIcon;
}

export interface SummaryGroup {
  title: string;
  options: SummaryOption[];
  /** Value of the pressed option, "" when none. */
  selected: string;
  onSelect: (value: string) => void;
}

export interface SummaryFact {
  label: string;
  value: ReactNode;
  href?: string;
}

interface Props {
  total: number;
  totalLabel: string;
  groups: SummaryGroup[];
  facts?: SummaryFact[];
}

/**
 * Supporting pane of a feed: the total, counts that also filter, and a few facts as plain lines.
 * On a phone it sits above the list as wrapped chips.
 */
export function FeedSummary({ total, totalLabel, groups, facts = [] }: Props) {
  return (
    <div className="flex flex-col gap-4 py-1">
      <p className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{total}</span>
        <span className="text-sm text-muted-foreground">{totalLabel}</span>
      </p>

      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold">{group.title}</h3>
          <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
            {group.options.map((option) => {
              const pressed = group.selected === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => group.onSelect(pressed ? "" : option.value)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md border px-2.5 py-1 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 lg:border-transparent",
                    pressed && "bg-muted font-medium",
                  )}
                >
                  {option.icon ? (
                    <span className="flex items-center gap-2">
                      <option.icon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                      {option.label}
                    </span>
                  ) : (
                    <span>{option.label}</span>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums">{option.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {facts.length > 0 && (
        <dl className="flex flex-col gap-1.5 border-t pt-3 text-sm">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">
                {fact.href ? (
                  <Link href={fact.href} className="underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                    {fact.label}
                  </Link>
                ) : (
                  fact.label
                )}
              </dt>
              <dd className="font-medium tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
