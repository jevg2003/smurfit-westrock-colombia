"use client";

import { useMemo, useState } from "react";
import { createFilterQuery } from "@/components/reui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/reui/filters/filters-types";
import { ALERT_STATE_LABELS, DIMENSION_LABELS, SEVERITY_LABELS } from "@/core/labels";
import { bogotaDateKey } from "@/core/time/bogota";
import { PESTEL_LABELS } from "@/features/entorno/labels";
import { applyFilters } from "@/features/filtros/apply-filters";
import type { DayRange } from "@/features/filtros/date-range-filter";
import type { AlertRow } from "./alerts-grid";

const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

/** Filter schema for signals / alerts. The `state` filter only makes sense where states are shown. */
export function alertFilterFields(withState: boolean): FilterField[] {
  return [
    { id: "dimension", label: "Dimensión", type: "select", options: options(DIMENSION_LABELS) },
    { id: "severity", label: "Severidad", type: "select", options: options(SEVERITY_LABELS) },
    { id: "pestel", label: "PESTEL", type: "select", options: options(PESTEL_LABELS) },
    ...(withState
      ? [{ id: "state", label: "Estado", type: "select", options: options(ALERT_STATE_LABELS) } satisfies FilterField]
      : []),
  ];
}

const ACCESSORS = {
  dimension: (row: AlertRow) => row.signal.dimension,
  severity: (row: AlertRow) => row.signal.severity,
  pestel: (row: AlertRow) => row.signal.pestel,
  state: (row: AlertRow) => row.alert.state,
};

/** Filter chips plus a date range, applied to alert rows. */
export function useRowFilters(rows: AlertRow[], { withState }: { withState: boolean }) {
  const [query, setQuery] = useState<FilterQuery>(() => createFilterQuery());
  const [dates, setDates] = useState<DayRange | undefined>();
  const range = dates;

  const filtered = useMemo(() => {
    const byChips = applyFilters(rows, query, ACCESSORS);
    if (!range) return byChips;
    return byChips.filter((row) => {
      const day = bogotaDateKey(row.signal.occurredAt);
      return day >= range.fromDate && day <= range.toDate;
    });
  }, [rows, query, range]);

  const fields = useMemo(() => alertFilterFields(withState), [withState]);
  return { query, setQuery, dates, setDates, filtered, fields, isFiltering: filtered.length !== rows.length };
}
