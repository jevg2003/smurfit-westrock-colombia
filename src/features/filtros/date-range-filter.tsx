"use client";

import { DateRangePicker } from "@/components/date/date-range-picker";
import type { DayRange } from "@/components/date/day-keys";

export type { DayRange } from "@/components/date/day-keys";

interface Props {
  value: DayRange | undefined;
  onChange: (value: DayRange | undefined) => void;
  label?: string;
}

/** Period filter for the list screens: shortcuts (last week, 7 days, month, 12 months) or a custom range. */
export function DateRangeFilter({ value, onChange, label = "Período" }: Props) {
  return <DateRangePicker label={label} value={value} onChange={onChange} />;
}
