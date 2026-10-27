import { ChevronDownIcon } from "lucide-react";
import { useId } from "react";

export interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  /** Text of the option that applies no filter (value ""). */
  allLabel?: string;
}

/**
 * One filter with its name always visible. A native select: it works on a phone, with the keyboard and
 * with assistive technology without a popover to open first.
 */
export function FilterSelect({ label, value, options, onChange, allLabel = "Todos" }: Props) {
  const id = useId();

  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 appearance-none rounded-lg border border-input bg-background ps-2.5 pe-7 text-sm outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute end-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}
