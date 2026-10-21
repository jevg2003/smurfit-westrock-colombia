"use client";

import { DateSelector, type DateSelectorValue } from "@/components/reui/date-selector";
import { DATE_SELECTOR_ES } from "./labels-es";

/** Inclusive range of calendar day keys (`YYYY-MM-DD`). */
export interface DayRange {
  fromDate: string;
  toDate: string;
}

/** Last year offered in the year lists; far enough that it needs no clock during render. */
const MAX_YEAR = 2035;

const pad = (n: number) => String(n).padStart(2, "0");
/** The calendar picks local dates; read them back as plain day keys. */
const keyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function rangeOf(value: DateSelectorValue | undefined): DayRange | undefined {
  if (!value?.startDate) return undefined;
  const from = keyOf(value.startDate);
  const to = value.endDate ? keyOf(value.endDate) : from;
  return from <= to ? { fromDate: from, toDate: to } : { fromDate: to, toDate: from };
}

interface Props {
  value: DateSelectorValue | undefined;
  /** Must be a stable function (a state setter): the selector calls it on mount. */
  onChange: (value: DateSelectorValue) => void;
  label?: string;
}

/** ReUI date-selector fixed to "between two days", in Spanish. */
export function DateRangeFilter({ value, onChange, label = "Período" }: Props) {
  return (
    <DateSelector
      label={label}
      value={value}
      onChange={onChange}
      presetMode="between"
      periodTypes={["day"]}
      defaultPeriodType="day"
      i18n={DATE_SELECTOR_ES}
      dayDateFormat="dd/MM/yyyy"
      inputHint="dd/mm/aaaa"
      maxYear={MAX_YEAR}
    />
  );
}
