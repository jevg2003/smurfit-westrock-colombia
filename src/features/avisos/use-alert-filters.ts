"use client";

import { useMemo, useState } from "react";
import type { DayRange } from "@/components/date/day-keys";
import type { FilterOption } from "@/components/layouts/filter-select";
import { useFilterValues } from "@/components/layouts/use-filter-values";
import { ALERT_STATE_LABELS, DIMENSION_LABELS, SEVERITY_LABELS } from "@/core/labels";
import { bogotaDateKey } from "@/core/time/bogota";
import type { AlertRow } from "./alert-row";

const options = (labels: Record<string, string>): FilterOption[] => Object.entries(labels).map(([value, label]) => ({ value, label }));

export const SEVERITY_OPTIONS = options(SEVERITY_LABELS);
export const TOPIC_OPTIONS = options(DIMENSION_LABELS);
export const STATE_OPTIONS = options(ALERT_STATE_LABELS);

/**
 * The few filters of the avisos: Estado, Gravedad, Tema and Período. Dismissed avisos stay out until Estado asks
 * for them, so the default view is "new and reviewed".
 */
export function useAlertFilters(rows: AlertRow[], { withState }: { withState: boolean }) {
  const { values, set, clear: clearValues, active } = useFilterValues({ state: "", severity: "", dimension: "" });
  const [dates, setDates] = useState<DayRange | undefined>();
  const hidesDismissed = withState && values.state === "";

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (withState) {
        if (values.state ? row.alert.state !== values.state : row.alert.state === "dismissed") return false;
      }
      if (values.severity && row.signal.severity !== values.severity) return false;
      if (values.dimension && row.signal.dimension !== values.dimension) return false;
      if (dates) {
        const day = bogotaDateKey(row.signal.occurredAt);
        if (day < dates.fromDate || day > dates.toDate) return false;
      }
      return true;
    });
  }, [rows, values, dates, withState]);

  return {
    values,
    set,
    dates,
    setDates,
    filtered,
    isFiltering: active || dates !== undefined,
    hiddenDismissed: hidesDismissed ? rows.filter((row) => row.alert.state === "dismissed").length : 0,
    clear: () => {
      clearValues();
      setDates(undefined);
    },
  };
}
