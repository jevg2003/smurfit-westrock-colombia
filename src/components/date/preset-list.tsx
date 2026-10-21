import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface PresetItem {
  id: string;
  label: string;
  active?: boolean;
  onSelect: () => void;
}

interface Props {
  items: PresetItem[];
  label: string;
  className?: string;
}

/** Shortcut column of the ReUI calendar-15 pattern: left of the calendar on desktop, below it on mobile. */
export function PresetList({ items, label, className }: Props) {
  return (
    <div className={cn("relative py-4 max-sm:order-1 max-sm:border-t sm:border-e", className)}>
      <div role="group" aria-label={label} className="flex flex-col px-2">
        {items.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={item.active ? "secondary" : "ghost"}
            aria-pressed={item.active}
            className="w-full justify-start"
            onClick={item.onSelect}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
