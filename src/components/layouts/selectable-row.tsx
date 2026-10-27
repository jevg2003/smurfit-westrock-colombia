import type { ReactNode } from "react";
import { Badge } from "@/components/reui/badge";
import { cn } from "@/lib/utils";
import type { EventBadge } from "@/components/events/event-item";

const VARIANT = {
  high: "destructive-light",
  medium: "warning-light",
  low: "info-light",
  positive: "success-light",
  neutral: "outline",
} as const;

export function SelectableList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="flex flex-col divide-y">
      {children}
    </ul>
  );
}

interface Props {
  title: string;
  subtitle?: ReactNode;
  badge?: EventBadge;
  selected: boolean;
  onSelect: () => void;
}

/** A row of a list-detail list that is not an event (a company, a dimension): one line, one badge, one click. */
export function SelectableRow({ title, subtitle, badge, selected, onSelect }: Props) {
  return (
    <li aria-current={selected ? "true" : undefined} className={cn("transition-colors hover:bg-muted/50", selected && "bg-muted")}>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full min-w-0 items-start justify-between gap-3 px-3 py-3 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("text-sm leading-snug", selected && "font-medium")}>{title}</span>
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        {badge && <Badge variant={VARIANT[badge.tone]}>{badge.label}</Badge>}
      </button>
    </li>
  );
}
